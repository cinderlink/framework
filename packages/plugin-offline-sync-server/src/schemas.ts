import { z } from 'zod';

// Base protocol request schema
const protocolRequestSchema = z.object({
  timestamp: z.number(),
  requestId: z.string()
});

// Offline sync send request schema (received by server)
const offlineSyncSendRequestSchema = protocolRequestSchema.extend({
  recipient: z.string(),
  message: z.record(z.string(), z.unknown()) // Generic outgoing message
});

// Offline sync send response schema (sent by server)
const offlineSyncSendResponseSchema = protocolRequestSchema.extend({
  saved: z.boolean(),
  error: z.string().optional()
});

// Offline sync get request schema (received by server)
const offlineSyncGetRequestSchema = protocolRequestSchema.extend({
  limit: z.number()
});

// Offline sync record schema
const offlineSyncRecordSchema = z.object({
  id: z.number(),
  requestId: z.string(),
  recipient: z.string(),
  message: z.record(z.string(), z.unknown()),
  sender: z.string(),
  attempts: z.number(),
  createdAt: z.number(),
  attemptedAt: z.number().optional(),
  deliveredAt: z.number().optional()
});

// Offline sync get response schema (sent by server)
const offlineSyncGetResponseSchema = protocolRequestSchema.extend({
  messages: z.array(offlineSyncRecordSchema)
});

// Offline sync get confirmation schema (received by server)
const offlineSyncGetConfirmationSchema = protocolRequestSchema.extend({
  saved: z.array(z.number()),
  errors: z.record(z.string(), z.string()).optional()
});

// Complete schema definition for offline sync server plugin
export const offlineSyncServerSchemas = {
  send: {
    '/offline/get/response': offlineSyncGetResponseSchema,
    '/offline/send/response': offlineSyncSendResponseSchema
  },
  receive: {
    '/offline/get/request': offlineSyncGetRequestSchema,
    '/offline/get/confirmation': offlineSyncGetConfirmationSchema,
    '/offline/send/request': offlineSyncSendRequestSchema
  },
  publish: {},
  subscribe: {},
  emit: {}
} as const;

// Export individual schemas for reuse
export {
  offlineSyncSendRequestSchema,
  offlineSyncSendResponseSchema,
  offlineSyncGetRequestSchema,
  offlineSyncGetResponseSchema,
  offlineSyncGetConfirmationSchema,
  offlineSyncRecordSchema
};