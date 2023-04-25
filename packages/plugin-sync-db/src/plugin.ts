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

const logPrefix = `plugin/sync`;

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
    console.info(`${logPrefix} > initializing`, { options });
  }

  coreEvents = {};
  pluginEvents = {};

  /**
   * Start the plugin
   * @returns void
   */
  async start() {
    console.info(`${logPrefix} > initializing table watchers`);
    if (!this.client.hasSchema("sync")) {
      this.schema = new Schema("sync", SyncSchemaDef, this.client.dag);
      this.client.addSchema("sync", this.schema as SchemaInterface);
    } else {
      this.schema = this.client.getSchema("sync") as Schema;
    }

    this.syncRows = this.schema.getTable<SyncRowsRow>("rows");
    this.syncTables = this.schema.getTable<SyncTablesRow>("tables");

    await this.syncRows.query().where("success", "=", true).delete().execute();

    this.client.pluginEvents.on(
      "/cinderlink/handshake/success",
      this.onHandshakeSuccess
    );
  }

  /**
   * On peer handshake success, notify the peer of the minimum lastSyncedAt value
   * @param peer
   */
  async onHandshakeSuccess(peer: Peer) {
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
      .execute()
      .then((r) => r.first().lastSyncedAt);

    return Number(lastTableSync);
  }

  /**
   * Add a table sync configuration
   * @param schemaId
   * @param tableId
   * @param config
   * @returns void
   */
  addTableSync<Row extends TableRow>(
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
    }

    if (config.fetchInterval || config.fetchFrom) {
      this.timers[`${schemaId}/${tableId}/fetch`] = setInterval(
        () => this.fetchTableRows(schemaId, tableId),
        config.fetchInterval || 1000 * 60 * 3
      );
    }

    console.info(`${logPrefix} > table configured for syncing`, {
      schemaId,
      tableId,
      fetchInterval: config.fetchInterval,
      syncInterval: config.syncInterval,
    });
  }

  /**
   * Sync the pending rows for a given table
   * @param schemaId
   * @param tableId
   * @returns
   */
  async syncTableRows(schemaId: string, tableId: string) {
    const sync = this.syncing[schemaId]?.[tableId];
    if (!sync) {
      console.warn(`${logPrefix} > table not configured for syncing`, {
        schemaId,
        tableId,
      });
      return;
    }

    const schema = this.client.getSchema(schemaId);
    if (!schema) {
      console.warn(`${logPrefix} > schema not found`, { schemaId });
      return;
    }

    const table = schema.getTable(tableId);
    if (!table) {
      console.warn(`${logPrefix} > table not found`, { schemaId, tableId });
      return;
    }

    const peers = this.client.peers
      .getAllPeers()
      .filter((peer) => peer.authenticated && peer.did !== undefined);

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
      const lastSyncedAt = await this.getLastSyncedAt(schemaId, tableId, did);
      const query = sync.query(
        table,
        { did, since: Number(lastSyncedAt) },
        this.client
      );
      const rows = await query.execute().then((r) => r.all());
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
      console.warn(`${logPrefix} > table not configured for syncing`, {
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
      console.warn(`${logPrefix} > table already fetched`, {
        schemaId,
        tableId,
      });
      return;
    }

    const table = this.client.getSchema(schemaId)?.getTable(tableId);
    if (!table) {
      console.warn(`${logPrefix} > table not found`, { schemaId, tableId });
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
      console.warn(`${logPrefix} > peer not found`, { did });
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
      console.warn(`${logPrefix} > peer not found`, { did });
      return;
    }

    console.info(`${logPrefix} > sending sync rows`, {
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
      console.warn(
        `${logPrefix} > received sync message from unauthenticated peer: \`${message.peer.peerId}\``
      );
      return;
    }
    if (message.peer.did === this.client.id) return;
    const { schemaId, tableId, rows } = message.payload;
    // we have received a sync table message from another peer
    if (!this.syncing[schemaId]?.[tableId]) {
      console.warn(
        `${logPrefix} > received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const table = this.client.getSchema(schemaId)?.getTable(tableId);
    if (!table) {
      console.warn(
        `${logPrefix} > received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
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
        console.warn(`${logPrefix} > received row without uid, skipping`);
        continue;
      }

      const existing = await table.getByUid(row.uid as string);
      let save = true;
      if (
        existing &&
        !(await sync.allowUpdateFrom?.(
          row,
          message.peer.did,
          table,
          this.client
        ))
      ) {
        // console.info(
        //   `${logPrefix} > skipping update (not allowed)`,
        //   row.uid,
        //   message.peer.did
        // );
        save = false;
        // errors[row.uid] = "not allowed";
        // just ignore them
        saved.push(row.uid);
      } else if (!existing && !allowNew) {
        // console.info(
        //   `${logPrefix} > skipping new (not allowed)`,
        //   row.uid,
        //   message.peer.did
        // );
        save = false;
        errors[row.uid] = "not allowed to insert";
      } else if ((existing?.updatedAt || 0) >= (row.updatedAt || 0)) {
        // console.info(
        //   `${logPrefix} > skipping update (older)`,
        //   row.uid,
        //   message.peer.did
        // );
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
        console.info(`${logPrefix} > saving row`, row.uid, data);
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
      console.warn(
        `${logPrefix} > received sync message from unauthenticated peer: \`${message.peer.peerId}\``
      );
      return;
    }

    const { tableId, schemaId, saved, errors } = message.payload;
    if (!this.syncing[schemaId]?.[tableId]) {
      console.warn(
        `${logPrefix} > received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const table = this.client.getSchema(schemaId)?.getTable(tableId);
    if (!table) {
      console.warn(
        `${logPrefix} > received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    if (saved?.length) {
      for (const uid of saved.filter((uid) => !!uid)) {
        console.info(`${logPrefix} > marking row as synced`, {
          schemaId,
          tableId,
          uid,
          did: message.peer.did,
        });
        await this.syncRows?.upsert(
          {
            schemaId,
            tableId,
            rowUid: uid,
            did: message.peer.did,
          },
          {
            success: true,
            lastSyncedAt: Date.now(),
          }
        );
      }
    }

    console.info("saving sync table", {
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
      console.info(`${logPrefix}/${schemaId}/${tableId} > error syncing row`, {
        uid,
        error,
      });
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
      console.warn(
        `${logPrefix} > received sync message from unauthenticated peer: \`${message.peer.peerId}\``
      );
      return;
    }

    const { schemaId, tableId } = message.payload;
    if (!this.syncing[schemaId]?.[tableId]) {
      console.warn(
        `${logPrefix} > received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const table = this.client.getSchema(schemaId)?.getTable(tableId);
    if (!table) {
      console.warn(
        `${logPrefix} > received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const sync = this.syncing[schemaId][tableId];

    if (
      (await sync.allowFetchFrom?.(message.peer.did, table, this.client)) ===
      false
    ) {
      console.warn(
        `${logPrefix} > fetch not allowed for peer: ${message.peer.did}`
      );
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
      console.warn(
        `${logPrefix} > received sync message from unauthenticated peer: \`${message.peer.peerId}\``
      );
      return;
    }

    const { tableId, schemaId, rows } = message.payload;
    if (!this.syncing[schemaId]?.[tableId]) {
      console.warn(
        `${logPrefix} > received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    const table = this.client.getSchema(schemaId)?.getTable(tableId);
    if (!table) {
      console.warn(
        `${logPrefix} > received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
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

      console.info(`${logPrefix}/${schemaId}/${tableId} > saving fetched row`, {
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
      console.warn(
        `${logPrefix} > received sync message from unauthenticated peer: \`${message.peer.peerId}\``
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

    console.info(`${logPrefix} > updated sync times for peer`, {
      peerId: message.peer.peerId,
      did: message.peer.did,
      since,
    });
  }
}
export default SyncDBPlugin;
