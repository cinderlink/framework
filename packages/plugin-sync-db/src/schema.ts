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
export default SyncSchemaDef;
