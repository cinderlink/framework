import { Schema } from "@cinderlink/ipld-database";
import {
  CinderlinkClientInterface,
  EncodingOptions,
  IncomingP2PMessage,
  PluginInterface,
  SyncPluginEvents,
  SyncPluginOptions,
} from "@cinderlink/core-types";
import { TableSync } from "./table-sync";
import SyncSchemaDef from "./schema";

const logPrefix = `plugin/sync`;

export class SyncDBPlugin
  implements
    PluginInterface<
      SyncPluginEvents,
      CinderlinkClientInterface<SyncPluginEvents>
    >
{
  id = "sync";

  schemas: Record<string, Record<string, TableSync>> = {};

  constructor(
    public client: CinderlinkClientInterface<SyncPluginEvents>,
    public options: SyncPluginOptions
  ) {
    console.info(`${logPrefix} > initializing`, { options });
  }

  p2p = {
    "/cinderlink/sync/table/request": this.onSyncTableRequest,
    "/cinderlink/sync/table/response": this.onSyncTableResponse,
  };
  pubsub = {};
  coreEvents = {};
  pluginEvents = {};

  async start() {
    console.info(`${logPrefix} > initializing table watchers`);
    let syncSchema: Schema;
    if (!this.client.hasSchema("sync")) {
      syncSchema = new Schema("sync", SyncSchemaDef, this.client.dag);
      this.client.addSchema("sync", syncSchema);
    } else {
      syncSchema = this.client.getSchema("sync") as Schema;
    }

    Object.entries(this.options.schemas).forEach(([schemaId, tables]) => {
      const schema = this.client.getSchema(schemaId);
      if (!schema) throw new Error(`Schema: ${schemaId} not found`);
      if (!this.schemas[schemaId]) this.schemas[schemaId] = {};
      Object.entries(tables).forEach(([tableId, rules]) => {
        const table = schema.getTable(tableId);
        if (!table) throw new Error(`Table: ${tableId} not found`);
        console.info(
          `${logPrefix} > creating table sync \`${table.def.schemaId}\`.\`${table.tableId}\``
        );
        this.schemas[schemaId][tableId] = new TableSync(
          table,
          rules,
          syncSchema as Schema,
          this.client
        );
      });
    });
  }

  async onSyncTableRequest(
    message: IncomingP2PMessage<
      SyncPluginEvents,
      "/cinderlink/sync/table/request",
      EncodingOptions
    >
  ) {
    const { schemaId, tableId } = message.payload;
    // we have received a sync table message from another peer
    if (!this.schemas[schemaId]?.[tableId]) {
      console.warn(
        `${logPrefix} > received sync message for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    console.info(
      `${logPrefix} > incoming table sync request: \`${message.payload.schemaId}\`.\`${message.payload.tableId}\``
    );
    return this.schemas[schemaId][tableId].syncIncoming(
      message.payload,
      message.peer
    );
  }

  async onSyncTableResponse(
    message: IncomingP2PMessage<
      SyncPluginEvents,
      "/cinderlink/sync/table/response",
      EncodingOptions
    >
  ) {
    const { tableId, schemaId } = message.payload;

    if (!this.schemas[schemaId]?.[tableId]) {
      console.warn(
        `${logPrefix} > received sync response for unknown table: \`${schemaId}\`.\`${tableId}\``
      );
      return;
    }

    return this.schemas[schemaId][tableId].syncResponse(
      message.payload,
      message.peer
    );
  }
}
export default SyncDBPlugin;
