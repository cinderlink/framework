import { Schema } from "@cinderlink/ipld-database";
import {
  CinderlinkClientInterface,
  EncodingOptions,
  IncomingP2PMessage,
  IncomingPubsubMessage,
  PluginInterface,
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

export class SyncDBPlugin
  implements
    PluginInterface<
      SyncPluginEvents,
      CinderlinkClientInterface<SyncPluginEvents>
    >
{
  id = "sync";
  schema?: Schema;
  syncRows?: TableInterface<SyncRowsRow>;
  syncTables?: TableInterface<SyncTablesRow>;
  syncing: Record<string, Record<string, SyncConfig<any>>> = {};
  timers: Record<string, NodeJS.Timer> = {};

  constructor(
    public client: CinderlinkClientInterface<SyncPluginEvents>,
    public options: SyncPluginOptions
  ) {
    console.info(`${logPrefix} > initializing`, { options });
  }

  p2p = {
    "/cinderlink/sync/save/request": this.onSyncSaveRequest,
    "/cinderlink/sync/save/response": this.onSyncSaveResponse,
    "/cinderlink/sync/fetch/request": this.onSyncFetchRequest,
    "/cinderlink/sync/fetch/response": this.onSyncFetchResponse,
  };
  pubsub = {
    "/cinderlink/sync/save/request": this.onSyncSaveRequest,
    "/cinderlink/sync/save/response": this.onSyncSaveResponse,
    "/cinderlink/sync/fetch/request": this.onSyncFetchRequest,
    "/cinderlink/sync/fetch/response": this.onSyncFetchResponse,
  };
  coreEvents = {};
  pluginEvents = {};

  async start() {
    console.info(`${logPrefix} > initializing table watchers`);
    if (!this.client.hasSchema("sync")) {
      this.schema = new Schema("sync", SyncSchemaDef, this.client.dag);
      this.client.addSchema("sync", this.schema);
    } else {
      this.schema = this.client.getSchema("sync") as Schema;
    }

    this.syncRows = this.schema.getTable<SyncRowsRow>("rows");
    this.syncTables = this.schema.getTable<SyncTablesRow>("tables");
  }

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
      .getPeers()
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
        { did, since: lastSyncedAt },
        this.client
      );
      const rows = await query.execute().then((r) => r.rows);
      if (!rows.length) {
        continue;
      }
      console.info({ did, schemaId, tableId, rows, lastSyncedAt });

      const syncRows: TableRow[] = [];
      for (const row of rows) {
        const syncRow = (
          ((await sync.syncRowTo?.(row, peers, table, this.client)) || [
            did,
          ]) as string[]
        ).includes(did);
        if (!row.updatedAt) {
          row.updatedAt = Date.now();
          await table.update(row.id, row);
        }
        if (syncRow) {
          syncRows.push(row);
        }
      }

      if (!syncRows.length) {
        continue;
      }

      await this.sendSyncRows(schemaId, tableId, did, syncRows);
    }
  }

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
    return table?.lastSyncedAt || 0;
  }

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

    const peers = this.client.peers.getPeers().filter((p) => !!p.did);

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
      } else if (!existing && !allowNew) {
        // console.info(
        //   `${logPrefix} > skipping new (not allowed)`,
        //   row.uid,
        //   message.peer.did
        // );
        save = false;
      }
      saved.push(row.uid);
      if (save) {
        const { id, ...data } = row as any;
        const existing = await table.getByUid(row.uid as string);
        if ((existing?.updatedAt || 0) > (row.updatedAt || 0)) {
          continue;
        }
        if (!data.updatedAt) {
          data.updatedAt = Date.now();
        }
        // console.info(`${logPrefix} > saving row`, row.uid, data);
        await table.upsert({ uid: row.uid }, data);
      }
    }

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/cinderlink/sync/save/response",
      payload: {
        requestId: uuid(),
        schemaId,
        tableId,
        saved,
      },
    });
  }

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
        // console.info(`${logPrefix} > marking row as synced`, {
        //   schemaId,
        //   tableId,
        //   uid,
        //   did: message.peer.did,
        // });
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
      await this.syncRows?.upsert(
        { schemaId, tableId, rowUid: uid, did: message.peer.did },
        {
          success: false,
          error,
        }
      );
    }
  }

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
      await this.syncRows?.upsert(
        { schemaId, tableId, rowUid: row.uid, did: message.peer.did },
        {
          lastFetchedAt: Date.now(),
        }
      );
    }
  }
}
export default SyncDBPlugin;
