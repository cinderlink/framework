import { v4 as uuid } from "uuid";
import {
  CandorClientInterface,
  Peer,
  SyncPluginEvents,
  SyncTableRequest,
  SyncTableResponse,
  SyncTableRow,
  SyncTableRules,
  TableInterface,
  TableRow,
} from "@candor/core-types";
import { Schema } from "@candor/ipld-database";

export const SyncSchemaDef = {
  tables: {
    schemaId: "sync",
    encrypted: false,
    aggregate: {},
    indexes: {
      did: {
        unique: true,
        fields: ["did"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["id", "table", "table_id"],
    },
    schema: {
      type: "object",
      properties: {
        schemaId: { type: "string" },
        tableId: { type: "string" },
        rowId: { type: "number" },
        did: { type: "string" },
        success: { type: "boolean" },
        attempts: { type: "number" },
        lastAttemptedat: { type: "number" },
      },
    },
  },
};

export class TableSync {
  // _interval: NodeJS.Timer;
  _logPrefix: string;
  schema: Schema;
  syncTable: TableInterface<SyncTableRow>;

  constructor(
    public table: TableInterface,
    public rules: SyncTableRules,
    public client: CandorClientInterface<SyncPluginEvents>
  ) {
    this._logPrefix = `/plugin/sync/${table.def.schemaId}/${table.tableId}`;
    // this._interval = setInterval(
    //   this.syncOutgoing.bind(this),
    //   rules.frequency || 3000
    // );
    this.schema = new Schema("sync", SyncSchemaDef, table.dag);
    this.syncTable = this.schema.getTable<SyncTableRow>("tables");
  }

  async syncOutgoing() {
    let traversing = true;
    let offset = 0;

    const toSync: Record<string, TableRow[]> = {};

    // filter to authenticated peers
    const peers = this.client.peers.getPeers().filter((p) => !!p.did);
    while (traversing) {
      const chunk = await this.table
        .query()
        .select()
        .offset(offset)
        .limit(this.rules.chunkSize)
        .execute()
        .then((r) => r.all());
      if (chunk.length === 0) {
        traversing = false;
      }
      for (const row of chunk) {
        const syncedTo = await this.syncTable
          .query()
          .select()
          .where("schemaId", "=", this.table.def.schemaId)
          .where("tableId", "=", this.table.tableId)
          .where("rowId", "=", row.id)
          .where("success", "=", true)
          .execute()
          .then((r) => r.all().map((r) => r.did));
        const syncPeers = peers.filter(
          (p) => !syncedTo.includes(p.did as string)
        );
        for (const peer of syncPeers) {
          const did: string = peer.did as string;
          if (!toSync[did]) {
            toSync[did] = [];
          }
          toSync[did].push(row);
        }
      }
    }

    await Promise.all(
      Object.entries(toSync).map(async ([did, rows]) =>
        this.client.send(did, {
          topic: "/candor/sync/table/request",
          payload: {
            requestId: uuid(),
            schemaId: this.table.def.schemaId,
            tableId: this.table.tableId,
            rows,
          },
        })
      )
    );
  }

  async syncIncoming(payload: SyncTableRequest, peer: Peer) {
    const { tableId, schemaId, rows } = payload;
    const toSync = this.rules.allowIncoming
      ? rows.filter((row: TableRow) =>
          this.rules.allowIncoming?.(row, peer, this.client)
        )
      : rows;

    if (toSync.length === 0) {
      console.warn(
        `${this._logPrefix} > received sync message for table: ${tableId} but no rows were allowed`
      );
      return;
    }

    const schema = this.client.getSchema(schemaId);
    if (!schema) {
      console.warn(
        `${this._logPrefix} > received sync message for table: ${tableId} but schema: ${schemaId} is not known`
      );
      return;
    }

    const table = schema.getTable(tableId);
    if (!table) {
      console.warn(
        `${this._logPrefix} > received sync message for table: \`${schemaId}\`.\`${tableId}\` but table is not known`
      );
      return;
    }
    const { saved, errors } = await table.bulkInsert(toSync);

    // tell the remote user we have received the rows
    this.client.send(peer.peerId.toString(), {
      topic: "/candor/sync/table/response",
      payload: {
        requestId: payload.requestId,
        tableId: payload.tableId,
        schemaId: payload.schemaId,
        saved,
        errors,
      },
    });
  }

  async syncResponse(payload: SyncTableResponse, peer: Peer) {
    const { saved, errors } = payload;

    if (!peer.did) {
      console.warn(
        `${this._logPrefix} > unable to sync response for unknown peer`,
        { peer }
      );
      return;
    }

    for (const row of [...saved, ...Object.keys(errors)]) {
      const existing = await this.syncTable
        .query()
        .where("schemaId", "=", this.table.def.schemaId)
        .where("tableId", "=", this.table.tableId)
        .where("rowId", "=", row as number)
        .where("did", "=", peer.did)
        .select()
        .execute()
        .then((r) => r.first());

      const attempts = (existing?.attempts || 0) + 1;
      await this.syncTable.upsert(
        {
          schemaId: this.table.def.schemaId,
          tableId: this.table.tableId,
          rowId: row,
          did: peer.did,
        },
        {
          attempts,
          success: saved.includes(row as number),
        }
      );
    }
  }
}
export default TableSync;
