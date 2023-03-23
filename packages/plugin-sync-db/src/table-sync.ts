import {
  CinderlinkClientInterface,
  Peer,
  SyncPluginEvents,
  SyncTableRequest,
  SyncTableResponse,
  SyncTableRow,
  SyncTableRules,
  TableInterface,
  TableRow,
} from "@cinderlink/core-types";
import { Schema } from "@cinderlink/ipld-database";

export class TableSync {
  _interval: NodeJS.Timer;
  _logPrefix: string;

  syncTable: TableInterface<SyncTableRow>;
  syncing = false;

  constructor(
    public table: TableInterface,
    public rules: SyncTableRules,
    public schema: Schema,
    public client: CinderlinkClientInterface<SyncPluginEvents>
  ) {
    this._logPrefix = `/plugin/sync/${table.def.schemaId}/${table.tableId}`;
    this._interval = setInterval(this.syncOutgoing.bind(this), 30000);
    this.syncTable = this.schema.getTable<SyncTableRow>("tables");
  }

  async syncOutgoing() {
    if (this.syncing) return;
    this.syncing = true;

    let offset = 0;
    const toSync: Record<string, TableRow[]> = {};

    // filter to authenticated peers
    const peers = this.client.peers.getPeers().filter((p) => !!p.did);
    const chunk = await this.table
      .query()
      .select()
      .offset(offset)
      .limit(this.rules.chunkSize)
      .execute()
      .then((r) => r.all())
      .catch(() => undefined);
    if (!chunk || chunk.length === 0) {
      return;
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
        .then((r) => r.all().map((r) => r.did))
        .catch(() => undefined);
      if (syncedTo) {
        const syncPeers = peers.filter(
          (p) => !syncedTo.includes(p.did as string)
        );
        for (const peer of syncPeers) {
          if (!peer.did) continue;
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
          topic: "/cinderlink/sync/table/request",
          payload: {
            requestId: self.crypto.randomUUID(),
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
      topic: "/cinderlink/sync/table/response",
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
