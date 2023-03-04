import {
  CandorClientInterface,
  EncodingOptions,
  IncomingP2PMessage,
  PluginInterface,
  SyncPluginEvents,
  SyncPluginOptions,
} from "@candor/core-types";
import { TableSync } from "./table-sync";

const logPrefix = `plugin/sync`;

export class SyncDBPlugin
  implements
    PluginInterface<SyncPluginEvents, CandorClientInterface<SyncPluginEvents>>
{
  id = "sync";

  schemas: Record<string, Record<string, TableSync>> = {};

  constructor(
    public client: CandorClientInterface<SyncPluginEvents>,
    public options: SyncPluginOptions
  ) {
    console.info(`${logPrefix} > initializing`, { options });
  }

  p2p = {
    "/candor/sync/table/request": this.onSyncTableRequest,
    "/candor/sync/table/response": this.onSyncTableResponse,
  };
  pubsub = {};
  coreEvents = {};
  pluginEvents = {};

  async start() {
    console.info(`${logPrefix} > initializing table watchers`);
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
          this.client
        );
      });
    });
  }

  async onSyncTableRequest(
    message: IncomingP2PMessage<
      SyncPluginEvents,
      "/candor/sync/table/request",
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
      "/candor/sync/table/response",
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
