import { z } from '@cinderlink/schema-registry';

// Sync Tables Schema
export const SyncTablesSchema = z.object({
  schemaId: z.string(),
  tableId: z.string(),
  did: z.string(),
  lastSyncedAt: z.number(),
  lastFetchedAt: z.number(),
});

// Sync Rows Schema
export const SyncRowsSchema = z.object({
  schemaId: z.string(),
  tableId: z.string(),
  rowUid: z.string(),
  did: z.string(),
  success: z.boolean(),
  error: z.string(),
  attempts: z.number(),
  lastSyncedAt: z.number(),
});

// Schema registry entries
export const syncSchemas = {
  tables: { schema: SyncTablesSchema, version: 1 },
  rows: { schema: SyncRowsSchema, version: 1 },
} as const;