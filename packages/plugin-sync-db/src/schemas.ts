import { z } from 'zod';

// Base protocol request schema
const protocolRequestSchema = z.object({
  timestamp: z.number(),
  requestId: z.string()
});

// Table row schema - needs to handle both cases: with id (existing) and without id (new)
const tableRowSchema = z.object({
  id: z.number().optional(), // Optional for new rows, required for existing rows 
  uid: z.string(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional()
}).passthrough(); // Allow additional properties

// Sync save request schema
const syncSaveRequestSchema = protocolRequestSchema.extend({
  schemaId: z.string(),
  tableId: z.string(),
  rows: z.array(tableRowSchema)
});

// Sync save response schema
const syncSaveResponseSchema = protocolRequestSchema.extend({
  schemaId: z.string(),
  tableId: z.string(),
  saved: z.array(z.string()).optional(),
  errors: z.record(z.string(), z.string()).optional()
});

// Sync fetch request schema
const syncFetchRequestSchema = protocolRequestSchema.extend({
  schemaId: z.string(),
  tableId: z.string(),
  since: z.number()
});

// Sync fetch response schema
const syncFetchResponseSchema = protocolRequestSchema.extend({
  schemaId: z.string(),
  tableId: z.string(),
  rows: z.array(tableRowSchema)
});

// Sync since request schema
const syncSinceRequestSchema = z.object({
  timestamp: z.number(),
  since: z.number()
});

// Complete schema definition for sync DB plugin
export const syncDbSchemas = {
  send: {
    '/cinderlink/sync/save/request': syncSaveRequestSchema,
    '/cinderlink/sync/save/response': syncSaveResponseSchema,
    '/cinderlink/sync/fetch/request': syncFetchRequestSchema,
    '/cinderlink/sync/fetch/response': syncFetchResponseSchema,
    '/cinderlink/sync/since': syncSinceRequestSchema
  },
  receive: {
    '/cinderlink/sync/save/request': syncSaveRequestSchema,
    '/cinderlink/sync/save/response': syncSaveResponseSchema,
    '/cinderlink/sync/fetch/request': syncFetchRequestSchema,
    '/cinderlink/sync/fetch/response': syncFetchResponseSchema,
    '/cinderlink/sync/since': syncSinceRequestSchema
  },
  publish: {
    '/cinderlink/sync/save/request': syncSaveRequestSchema,
    '/cinderlink/sync/save/response': syncSaveResponseSchema,
    '/cinderlink/sync/fetch/request': syncFetchRequestSchema,
    '/cinderlink/sync/fetch/response': syncFetchResponseSchema
  },
  subscribe: {
    '/cinderlink/sync/save/request': syncSaveRequestSchema,
    '/cinderlink/sync/save/response': syncSaveResponseSchema,
    '/cinderlink/sync/fetch/request': syncFetchRequestSchema,
    '/cinderlink/sync/fetch/response': syncFetchResponseSchema
  },
  emit: {}
} as const;

// Export individual schemas for reuse
export {
  syncSaveRequestSchema,
  syncSaveResponseSchema,
  syncFetchRequestSchema,
  syncFetchResponseSchema,
  syncSinceRequestSchema,
  tableRowSchema
};