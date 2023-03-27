import {
  SyncRowsRow,
  SyncTablesRow,
  TableDefinition,
} from "@cinderlink/core-types";

export const SyncSchemaDef = {
  tables: {
    schemaId: "sync",
    encrypted: false,
    aggregate: {},
    indexes: {
      table_did: {
        unique: true,
        fields: ["schemaId", "tableId", "did"],
      },
      table: {
        unique: false,
        fields: ["schemaId", "tableId"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["id", "schemaId", "tableId", "did"],
    },
    schema: {
      type: "object",
      properties: {
        schemaId: { type: "string" },
        tableId: { type: "string" },
        did: { type: "string" },
        lastSyncedAt: { type: "number" },
        lastFetchedAt: { type: "number" },
      },
    },
  } as TableDefinition<SyncTablesRow>,
  rows: {
    schemaId: "sync",
    encrypted: false,
    aggregate: {},
    indexes: {
      unique: {
        unique: true,
        fields: ["schemaId", "tableId", "did", "rowUid"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["id", "schemaId", "tableId", "rowUid"],
    },
    schema: {
      type: "object",
      properties: {
        schemaId: { type: "string" },
        tableId: { type: "string" },
        rowUid: { type: "string" },
        did: { type: "string" },
        success: { type: "boolean" },
        error: { type: "string" },
        attempts: { type: "number" },
        lastSyncedAt: { type: "number" },
      },
    },
  } as TableDefinition<SyncRowsRow>,
};
export default SyncSchemaDef;
