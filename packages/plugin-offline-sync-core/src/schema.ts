import { Schema } from "@cinderlink/ipld-database";
import {
  CinderlinkClientInterface,
  TableDefinition,
} from "@cinderlink/core-types";
import { OfflineSyncRecord } from "./types";

export const OfflineSyncSchemaDef: Record<string, TableDefinition<any>> = {
  messages: {
    schemaId: "offlineSync",
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
    schema: {
      type: "object",
      properties: {
        sender: { type: "string" },
        recipient: { type: "string" },
        message: { type: "object", additionalProperties: true, properties: {} },
        updatedAt: { type: "number" },
        deliveredAt: { type: "number" },
        attemptedAt: { type: "number" },
        attempts: { type: "number" },
      },
    },
  } as TableDefinition<OfflineSyncRecord>,
};

export default OfflineSyncSchemaDef;

export async function loadOfflineSyncSchema(
  client: CinderlinkClientInterface<any>
) {
  client.logger.info("offline-sync", "loading offline sync schema");
  if (!client.schemas["offlineSync"]) {
    const schema = new Schema(
      "offlineSync",
      OfflineSyncSchemaDef,
      client.dag,
      client.logger.module("db").submodule(`schema:offlineSync`)
    );
    await client.addSchema("offlineSync", schema);
  } else {
    client.schemas["offlineSync"].setDefs(OfflineSyncSchemaDef);
  }
}
