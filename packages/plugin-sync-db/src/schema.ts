import {
  SyncRowsRow,
  SyncTablesRow,
  TableDefinition,
} from "@cinderlink/core-types";

export const SyncSchemaDef: {
  tables: TableDefinition<SyncTablesRow>;
  rows: TableDefinition<SyncRowsRow>;
} = {
  tables: {
    schemaId: "sync.tables",
    schemaVersion: 1,
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
  },
  rows: {
    schemaId: "sync.rows",
    schemaVersion: 1,
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
  },
};
export default SyncSchemaDef;
