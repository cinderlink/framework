import Emittery from "emittery";
import { Schema } from "@cinderlink/ipld-database";
import {
  CinderlinkClientInterface,
  EncodingOptions,
  IncomingP2PMessage,
  IncomingPubsubMessage,
  Peer,
  PluginEventHandlers,
  PluginInterface,
  ProtocolEvents,
  ReceiveEvents,
  SchemaInterface,
  SubLoggerInterface,
  SubscribeEvents,
  SyncConfig,
  SyncPluginEvents,
  SyncPluginOptions,
  SyncRowsRow,
  SyncTablesRow,
  TableInterface,
  TableRow,
} from "@cinderlink/core-types";
import SyncSchemaDef from "./schema";
import { v4 as uuid } from "uuid";

/**
 * SyncDBPlugin
 * @class
 * @extends Emittery<SyncPluginEvents>
 * @implements PluginInterface<SyncPluginEvents>
 * @param client
 * @param options
 * @returns SyncDBPlugin
 * @example
 * ```typescript
 * import { SyncDBPlugin } from "@cinderlink/plugin-sync";
 * import { CinderlinkClient } from "@cinderlink/client";
 *
 * const client = new CinderlinkClient();
 * const syncPlugin = new SyncDBPlugin(client);
 * ```
 */
export class SyncDBPlugin<
    Client extends CinderlinkClientInterface<
      SyncPluginEvents & ProtocolEvents
    > = CinderlinkClientInterface<SyncPluginEvents & ProtocolEvents>
  >
  extends Emittery<SyncPluginEvents>
  implements PluginInterface<SyncPluginEvents>
{
  id = "sync";
  schema?: Schema;
  syncRows?: TableInterface<SyncRowsRow>;
  syncTables?: TableInterface<SyncTablesRow>;
  syncing: Record<string, Record<string, SyncConfig<any>>> = {};
  timers: Record<string, NodeJS.Timer> = {};
  logger: SubLoggerInterface;
  started = false;

  pubsub: PluginEventHandlers<SubscribeEvents<SyncPluginEvents>> = {
    "/cinderlink/sync/save/request": this.onSyncSaveRequest,
    "/cinderlink/sync/save/response": this.onSyncSaveResponse,
    "/cinderlink/sync/fetch/request": this.onSyncFetchRequest,
    "/cinderlink/sync/fetch/response": this.onSyncFetchResponse,
  };
  p2p: PluginEventHandlers<ReceiveEvents<SyncPluginEvents>> = {
    "/cinderlink/sync/save/request": this.onSyncSaveRequest,
    "/cinderlink/sync/save/response": this.onSyncSaveResponse,
    "/cinderlink/sync/fetch/request": this.onSyncFetchRequest,
    "/cinderlink/sync/fetch/response": this.onSyncFetchResponse,
    "/cinderlink/sync/since": this.onSyncSince,
  };

  constructor(
    public client: Client,
    public options: Partial<SyncPluginOptions> = {}
  ) {
    super();
    this.logger = this.client.logger.module("sync");
    this.logger.info(`initializing`, { options });
  }

  coreEvents = {};
  pluginEvents = {};

  /**
   * Start the plugin
   * @returns void
   */
  async start() {
    this.logger.info(`initializing table watchers`);
    if (!this.client.hasSchema("sync")) {
      this.schema = new Schema(
        "sync",
        SyncSchemaDef,
        this.client.dag,
        this.client.logger.module("db").submodule(`schema:sync`)
      );
      this.client.addSchema("sync", this.schema as SchemaInterface);
    } else {
      this.schema = this.client.getSchema("sync") as Schema;
    }

    this.syncRows = this.schema.getTable<SyncRowsRow>("rows");
    this.syncTables = this.schema.getTable<SyncTablesRow>("tables");

    this.client.on("/peer/connect", this.onPeerConnect.bind(this));
    this.started = true;
  }

  async stop() {
    this.started = false;
    this.logger.info(`stopping`);
    Object.values(this.timers).forEach((timer) => clearInterval(timer));
    this.timers = {};
    this.client.off("/peer/connect", this.onPeerConnect.bind(this));
  }

  /**
   * On peer connect: notify the peer of the minimum lastSyncedAt value
   * @param peer
   */
  async onPeerConnect(peer: Peer) {
    const minLastSyncedAt = await this.getMinLastSyncedAt(peer.did as string);
    await this.client.send(peer.peerId.toString(), {
      topic: "/cinderlink/sync/since",
      payload: {
        since: minLastSyncedAt,
      },
    });
  }

  /**
   * Get the minimum lastSyncedAt value for a given DID
   * @param did
   * @returns number
   */
  async getMinLastSyncedAt(did: string) {
    const lastTableSync = await this.syncTables
      ?.query()
      .where("did", "=", did)
      .orderBy("lastSyncedAt", "asc")
      .limit(1)
      .select()
      .execute()
      .then((r) => r.first()?.lastSyncedAt || 0);

    return Number(lastTableSync);
  }

  /**
   * Add a table sync configuration
   * @param schemaId
   * @param tableId
   * @param config
   * @returns void
   */
  async addTableSync<Row extends TableRow>(
    schemaId: string,
    tableId: string,
    config: SyncConfig<Row>
  ) {
    this.syncing[schemaId] = this.syncing[schemaId] || {};
    this.syncing[schemaId][tableId] = config;
    if (config.syncInterval || config.syncTo) {
      this.timers[`${schemaId}/${tableId}/sync`] = setInterval(
        () => this.syncTableRows(schemaId, tableId),
        config.syncInterval || 1000 * 60 * 3
      );
      await this.syncTableRows(schemaId, tableId);
    }

    if (config.fetchInterval || config.fetchFrom) {
      this.timers[`${schemaId}/${tableId}/fetch`] = setInterval(
        () => this.fetchTableRows(schemaId, tableId),
        config.fetchInterval || 1000 * 60 * 3
      );
      await this.fetchTableRows(schemaId, tableId);
    }

    if (config.syncOnChange) {
      const schema = this.client.getSchema(schemaId);
      if (!schema) {
        this.logger.warn(`schema not found`, { schemaId });
        return;
      }

      const table = schema.getTable(tableId);
      if (!table) {
        this.logger.warn(`table not found`, {
          schemaId,
          tableId,
        });
        return;
      }

      table.on(
        "/record/inserted",
        this.onTableRecordInserted.bind(this, schemaId, tableId)
      );
      table.on(
        "/record/updated",
        this.onTableRecordUpdated.bind(this, schemaId, tableId)
      );
      table.on(
        "/record/deleted",
        this.onTableRecordDeleted.bind(this, schemaId, tableId)
      );
    }

    this.logger.info(`table configured for syncing`, {
      schemaId,
      tableId,
      fetchInterval: config.fetchInterval,
      syncInterval: config.syncInterval,
    });
  }

  /**
   * Remove a table sync configuration & stop syncing
   * @param schemaId
   * @param tableId
   * @returns
   */
  async removeTableSync(schemaId: string, tableId: string) {
    delete this.syncing[schemaId]?.[tableId];
    clearInterval(this.timers[`${schemaId}/${tableId}/sync`]);
    clearInterval(this.timers[`${schemaId}/${tableId}/fetch`]);

    const schema = this.client.getSchema(schemaId);
    if (!schema) {
      this.logger.warn(`schema not found`, { schemaId });
      return;
    }

    const table = schema.getTable(tableId);
    if (!table) {
      this.logger.warn(`table not found`, { schemaId, tableId });
      return;
    }

    table.off(
      "/record/inserted",
      this.onTableRecordInserted.bind(this, schemaId, tableId)
    );
    table.off(
      "/record/updated",
      this.onTableRecordUpdated.bind(this, schemaId, tableId)
    );
    table.off(
      "/record/deleted",
      this.onTableRecordDeleted.bind(this, schemaId, tableId)
    );
  }

  /**
   * Table record inserted event handler
   * @param schemaId
   * @param tableId
   * @returns
   */
  async onTableRecordInserted(
    schemaId: string,
    tableId: string,
    record: TableRow
  ) {
    this.client.logger.debug("sync", `syncing inserted subscription record`, {
      schemaId,
      tableId,
      record,
    });
    await this.syncTableRows(schemaId, tableId, [record]);
  }

  /**
   * Table record updated event handler
   * @param schemaId
   * @param tableId
   * @param record
   */
  async onTableRecordUpdated(
    schemaId: string,
    tableId: string,
    record: TableRow
  ) {
    this.client.logger.debug("sync", `syncing updated subscription record`, {
      schemaId,
      tableId,
      record,
    });
    await this.syncTableRows(schemaId, tableId, [record]);
  }

  /**
   * Table record deleted event handler
   * @param schemaId
   * @param tableId
   * @param record
   */
  async onTableRecordDeleted(
    schemaId: string,
    tableId: string,
    record: TableRow
  ) {
    this.client.logger.debug("sync", `syncing deleted subscription record`, {
      schemaId,
      tableId,
      record,
    });
    await this.syncTableRows(schemaId, tableId, [record]);
  }

  /**
   * Sync the pending rows for a given table
   * @param schemaId
   * @param tableId
   * @returns
   */
  async syncTableRows(schemaId: string, tableId: string, toSync?: TableRow[]) {
    const sync = this.syncing[schemaId]?.[tableId];
    if (!sync) {
      this.logger.warn(`table not configured for syncing`, {
        schemaId,
        tableId,
      });
      return;
    }

    const schema = this.client.getSchema(schemaId);
    if (!schema) {
      this.logger.warn(`schema not found`, { schemaId });
      return;
    }

    const table = schema.getTable(tableId);
    if (!table) {
      this.logger.warn(`table not found`, { schemaId, tableId });
      return;
    }

    const peers = this.client.peers
      .getAllPeers()
      .filter((peer) => peer.did !== undefined);

    let syncDids: string[] = [];
    const syncTo = await sync.syncTo?.(peers, table, this.client);
    if (syncTo === true || syncTo === undefined) {
      syncDids = peers.map((p) => p.did) as string[];
    } else if (Array.isArray(syncTo)) {
      syncDids = syncTo;
    } else if (typeof syncTo === "string") {
      syncDids = [syncTo];
    }

    if (!syncDids.length) {
      return;
    }

    for (const did of syncDids) {
      let rows: TableRow[] = [];
      if (!toSync) {
        const lastSyncedAt = await this.getLastSyncedAt(schemaId, tableId, did);
        const query = sync.query(
          table,
          { did, since: Number(lastSyncedAt) },
          this.client
        );
        rows = await query.execute().then((r) => r.all());
      } else {
        rows = toSync;
      }
      if (!rows.length) {
        continue;
      }
      await this.sendSyncRows(schemaId, tableId, did, rows);
    }
  }

  /**
   * Get the timestamp of the last sync for a given table with a given peer
   * @param schemaId
   * @param tableId
   * @param did
   * @returns
   */
  async getLastSyncedAt(
    schemaId: string,
    tableId: string,
    did: string
  ): Promise<number> {
    const table = await this.syncTables
      ?.query()
      .where("schemaId", "=", schemaId)
      .where("tableId", "=", tableId)
      .where("did", "=", did)
      .select()
      .execute()
      .then((rows) => rows.first());
    return Number(table?.lastSyncedAt || 0);
  }

  /**
   * Fetch the rows of a given table that have been updated since a given timestamp
   * @param schemaId
   * @param tableId
   * @param did
   * @param rows
   * @returns
   */
  async fetchTableRows(
    schemaId: string,
    tableId: string,
    since: number | undefined = undefined
  ) {
    const sync = this.syncing[schemaId]?.[tableId];
    if (!sync) {
      this.logger.warn(`table not configured for syncing`, {
        schemaId,
        tableId,
      });
      return;
    }

    const tableRow = await this.syncTables
      ?.query()
      .where("schemaId", "=", schemaId)
      .where("tableId", "=", tableId)
      .select()
      .execute()
      .then((rows) => rows.first());

    if (!since) {
      since = tableRow?.lastFetchedAt || 0;
    }

    if (tableRow && tableRow.lastFetchedAt > since) {
      this.logger.warn(`table already fetched`, {
        schemaId,
        tableId,
      });
      return;
    }

    const table = this.client.getSchema(schemaId)?.getTable(tableId);
    if (!table) {
      this.logger.warn(`table not found`, { schemaId, tableId });
      return;
    }

    const peers = this.client.peers.getAllPeers().filter((p) => !!p.did);

    let recipients = await sync.fetchFrom?.(peers, table, this.client);
    if ([undefined, true].includes(recipients as any)) {
      recipients = peers.map((p) => p.did) as string[];
    } else if (recipients === false) {
      recipients = [];
    } else if (!Array.isArray(recipients)) {
      recipients = [recipients as string];
    }

    for (const recipient of recipients) {
      await this.sendFetchRequest(schemaId, tableId, recipient, since);
    }
  }

  /**
   * Send a request to a peer to fetch the rows of a given table that have been updated since a given timestamp
   * @param schemaId
   * @param tableId
   * @param did
   * @param since
   * @returns
   */
  async sendFetchRequest(
    schemaId: string,
    tableId: string,
    did: string,
    since: number
  ) {
    const peer = this.client.peers.getPeerByDID(did);
    if (!peer) {
      return;
    }

    return this.client.send(peer.peerId.toString(), {
      topic: "/cinderlink/sync/fetch/request",
      payload: {
        requestId: uuid(),
        schemaId,
        tableId,
        since,
      },
    });
  }

  /**
   * Send a request to a peer to save the given rows to a given table
   * @param schemaId
   * @param tableId
   * @param did
   * @param rows
   * @returns
   */
  async sendSyncRows(
    schemaId: string,
    tableId: string,
    did: string,
    rows: TableRow[]
  ) {
    const peer = this.client.peers.getPeerByDID(did);
    if (!peer) {
      return;
    }

    this.logger.info(`sending sync rows`, {
      schemaId,
      tableId,
      did,
      rows,
    });
    await this.client.send(peer.peerId.toString(), {
      topic: "/cinderlink/sync/save/request",
      payload: {
        requestId: uuid(),
        schemaId,
        tableId,
        rows,
      },
    });
  }

  /**
   * Handle a sync save request from a peer
   * @param message
   * @returns
   */
  async onSyncSaveRequest(
    message:
      | IncomingP2PMessage<
          SyncPluginEvents,
          "/cinderlink/sync/save/request",
          EncodingOptions
        >
      | IncomingPubsubMessage<
          SyncPluginEvents,
          "/cinderlink/sync/save/request",
          EncodingOptions
        >
  ) {
    if (!message.peer.did) {
      this.client.logger.warn(
        "sync",
        `received sync message from peer without DID: \`${message.peer.peerId}\``
      );
      return;
    }
    if (message.peer.did === this.client.id) return;
    const { schemaId, tableId, rows } = message.payload;
    // we have received a sync table message from another peer
    if (!this.syncing[schemaId]?.[tableId]) {
      this.client.logger.warn(
        "sync",
        `received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const table = this.client.getSchema(schemaId)?.getTable(tableId);
    if (!table) {
      this.client.logger.warn(
        "sync",
        `received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const sync = this.syncing[schemaId][tableId];
    const allowNew = sync.allowNewFrom
      ? await sync.allowNewFrom(message.peer.did, table, this.client)
      : true;
    const saved: string[] = [];
    const errors: Record<string, string> = {};

    for (const { id, ...row } of rows) {
      if (!row.uid) {
        this.logger.warn(`received row without uid, skipping`);
        continue;
      }

      const existing = await table.getByUid(row.uid as string);
      let save = true;
      if (
        existing &&
        sync.allowUpdateFrom &&
        !(await sync.allowUpdateFrom?.(
          row,
          message.peer.did,
          table,
          this.client
        ))
      ) {
        // this.logger.debug(`skipping update (peer not allowed to update)`, {
        //   row,
        //   peer: message.peer.did,
        // });
        save = false;
        // errors[row.uid] = "not allowed";
        // just ignore them
        saved.push(row.uid);
      } else if (!existing && !allowNew) {
        // this.logger.warn(`skipping new (peer not allowed to insert)`, {
        //   row,
        //   peer: message.peer.did,
        // });
        save = false;
        errors[row.uid] = "not allowed to insert";
      } else if ((existing?.updatedAt || 0) >= (row.updatedAt || 0)) {
        // this.logger.debug(`skipping update (older)`, {
        //   row,
        //   peer: message.peer.did,
        // });
        save = false;
        // ignore them
        saved.push(row.uid);
        // errors[row.uid] = "outdated";
      }
      if (save) {
        saved.push(row.uid);
        const { id, ...data } = row as any;
        const existing = await table
          .getByUid(row.uid as string)
          .catch(() => undefined);
        if ((existing?.updatedAt || 0) > (row.updatedAt || 0)) {
          continue;
        }
        if (!data.updatedAt) {
          data.updatedAt = Date.now();
        }
        this.logger.info(`saving row`, data);
        await table.upsert({ uid: row.uid }, data).catch(() => {});
      }
    }

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/cinderlink/sync/save/response",
      payload: {
        requestId: uuid(),
        schemaId,
        tableId,
        saved,
        errors,
      },
    });
  }

  /**
   * Handle a sync save response from a peer
   * @param message
   * @returns
   */
  async onSyncSaveResponse(
    message:
      | IncomingP2PMessage<
          SyncPluginEvents,
          "/cinderlink/sync/save/response",
          EncodingOptions
        >
      | IncomingPubsubMessage<
          SyncPluginEvents,
          "/cinderlink/sync/save/response",
          EncodingOptions
        >
  ) {
    if (!message.peer.did) {
      this.logger.warn(
        `received sync message from peer without DID: \`${message.peer.peerId}\``
      );
      return;
    }

    const { tableId, schemaId, saved, errors } = message.payload;
    if (!this.syncing[schemaId]?.[tableId]) {
      this.logger.warn(
        `received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const table = this.client.getSchema(schemaId)?.getTable(tableId);
    if (!table) {
      this.logger.warn(
        `received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    if (saved?.length) {
      await Promise.all(
        saved.map((uid) =>
          this.syncRows?.upsert(
            {
              schemaId,
              tableId,
              rowUid: uid,
              did: message.peer.did as string,
            },
            {
              success: true,
              lastSyncedAt: Date.now(),
            }
          )
        )
      );
    }

    this.logger.info("saving sync table", {
      schemaId,
      tableId,
      did: message.peer.did,
    });
    await this.syncTables?.upsert(
      {
        schemaId,
        tableId,
        did: message.peer.did,
      },
      {
        lastSyncedAt: Date.now(),
      }
    );

    const errorEntries = Object.entries(errors || {});
    for (const [uid, error] of errorEntries) {
      this.logger.error(
        `${schemaId}/${tableId} > error syncing row \`${uid}\`: ${error}`,
        {
          uid,
          error,
        }
      );
      await this.syncRows?.upsert(
        { schemaId, tableId, rowUid: uid, did: message.peer.did },
        {
          success: false,
          error,
        }
      );
    }
  }

  /**
   * Handle a sync fetch request from a peer
   * @param message
   * @returns
   */
  async onSyncFetchRequest(
    message:
      | IncomingP2PMessage<
          SyncPluginEvents,
          "/cinderlink/sync/fetch/request",
          EncodingOptions
        >
      | IncomingPubsubMessage<
          SyncPluginEvents,
          "/cinderlink/sync/fetch/request",
          EncodingOptions
        >
  ) {
    if (!message.peer.did) {
      this.logger.warn(
        `received sync message from peer without DID: \`${message.peer.peerId}\``
      );
      return;
    }

    const { schemaId, tableId } = message.payload;
    if (!this.syncing[schemaId]?.[tableId]) {
      this.logger.warn(
        `received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const table = this.client.getSchema(schemaId)?.getTable(tableId);
    if (!table) {
      this.logger.warn(
        `received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const sync = this.syncing[schemaId][tableId];

    if (
      (await sync.allowFetchFrom?.(message.peer.did, table, this.client)) ===
      false
    ) {
      this.logger.warn(`fetch not allowed for peer: ${message.peer.did}`);
      return;
    }

    const syncTable = await this.syncTables
      ?.query()
      .where("schemaId", "=", schemaId)
      .where("tableId", "=", tableId)
      .where("did", "=", message.peer.did)
      .select()
      .execute()
      .then((r) => r.first());

    const lastFetchedAt = Number(syncTable?.lastFetchedAt || 0);
    let since = message.payload.since || lastFetchedAt;
    if (lastFetchedAt > since) {
      return;
    }

    const rows = await table
      .query()
      .where("updatedAt", ">", since)
      .or((qb) => qb.where("createdAt", ">", since))
      .select()
      .execute()
      .then((r) => r.all());

    const allowedRows: TableRow[] = (
      await Promise.all(
        rows.map(async (row) => {
          if (
            message.peer.did &&
            (await sync.allowFetchRowFrom?.(
              message.peer.did,
              row.uid,
              table,
              this.client
            ))
          ) {
            return row;
          }
          return undefined;
        })
      )
    ).filter(Boolean) as TableRow[];

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/cinderlink/sync/fetch/response",
      payload: {
        requestId: message.payload.requestId,
        schemaId,
        tableId,
        rows: allowedRows,
      },
    });
  }

  /**
   * Handle a sync fetch response from a peer
   * @param message
   * @returns
   */
  async onSyncFetchResponse(
    message:
      | IncomingP2PMessage<
          SyncPluginEvents,
          "/cinderlink/sync/fetch/response",
          EncodingOptions
        >
      | IncomingPubsubMessage<
          SyncPluginEvents,
          "/cinderlink/sync/fetch/response",
          EncodingOptions
        >
  ) {
    if (!message.peer.did) {
      this.logger.warn(
        `received sync message from peer without DID: \`${message.peer.peerId}\``
      );
      return;
    }

    const { tableId, schemaId, rows } = message.payload;
    if (!this.syncing[schemaId]?.[tableId]) {
      this.logger.warn(
        `received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const table = this.client.getSchema(schemaId)?.getTable(tableId);
    if (!table) {
      this.logger.warn(
        `received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const sync = this.syncing[schemaId][tableId];
    for (const row of rows) {
      const existing = await table.getByUid(row.uid);
      if (
        !existing &&
        !sync.allowNewFrom?.(message.peer.did, table, this.client)
      ) {
        continue;
      } else if (
        existing &&
        !sync.allowUpdateFrom?.(row.uid, message.peer.did, table, this.client)
      ) {
        continue;
      } else if (
        (existing?.updatedAt || existing?.createdAt || 0) >
        (row.updatedAt || row.createdAt || 0)
      ) {
        continue;
      }

      await table.upsert({ uid: row.uid }, row);

      this.logger.info(`${schemaId}/${tableId} > saving fetched row`, {
        row,
      });
      await this.syncRows?.upsert(
        { schemaId, tableId, rowUid: row.uid, did: message.peer.did },
        {
          lastFetchedAt: Date.now(),
        }
      );
    }
  }

  /**
   * Handle a sync since request from a peer
   * @param message
   */
  async onSyncSince(
    message: IncomingP2PMessage<
      SyncPluginEvents,
      "/cinderlink/sync/since",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      this.logger.warn(
        `received sync message from peer without DID: \`${message.peer.peerId}\``
      );
      return;
    }

    const { since } = message.payload;
    // update the last sync time of all tables for this peer
    await this.syncTables
      ?.query()
      .where("did", "=", message.peer.did)
      .update({
        lastSyncedAt: since,
      })
      .execute();

    // update the last sync time of all rows for this peer
    await this.syncRows
      ?.query()
      .where("did", "=", message.peer.did)
      .update({
        lastSyncedAt: since,
      })
      .execute();

    this.logger.info(`updated sync times for peer`, {
      peerId: message.peer.peerId,
      did: message.peer.did,
      since,
    });
  }
}
export default SyncDBPlugin;
