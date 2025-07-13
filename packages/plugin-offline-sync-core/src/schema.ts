import { Schema } from "@cinderlink/ipld-database";
import {
  CinderlinkClientInterface,
  TableDefinition,
} from "@cinderlink/core-types";
import { OfflineSyncRecord } from "./types";
import { offlineSyncSchemas } from "./zod-schemas";

export const OfflineSyncSchemaDef: Record<string, TableDefinition<any>> = {
  messages: {
    schemaId: "offlineSync.messages",
    schemaVersion: 1,
    encrypted: false,
    aggregate: {},
    indexes: {
      remoteId: {
        unique: false,
        fields: ["sender", "recipient"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: [
        "id",
        "sender",
        "recipients",
        "updatedAt",
        "deliveredAt",
        "attemptedAt",
      ],
    },
  } as TableDefinition<OfflineSyncRecord>,
};

export default OfflineSyncSchemaDef;

export async function loadOfflineSyncSchema(
  client: CinderlinkClientInterface<any>
) {
  client.logger?.info("offline-sync", "loading offline sync schema");
  
  // Register Zod schemas with the schema registry
  if (client.schemaRegistry) {
    Object.entries(offlineSyncSchemas).forEach(([tableName, { schema, version }]) => {
      client.schemaRegistry!.registerSchema(`offlineSync.${tableName}`, version, {
        schema,
      });
    });
  }
  
  if (!client.schemas["offlineSync"]) {
    const schema = new Schema(
      "offlineSync",
      OfflineSyncSchemaDef,
      client.dag,
      client.logger.module("db").submodule(`schema:offlineSync`),
      true, // encrypted
      client.schemaRegistry
    );
    await client.addSchema("offlineSync", schema);
  } else {
    client.schemas["offlineSync"].setDefs(OfflineSyncSchemaDef);
  }
}
