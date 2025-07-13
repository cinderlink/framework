import { z } from 'zod';

// Base protocol request schema
const protocolRequestSchema = z.object({
  timestamp: z.number(),
  requestId: z.string()
});

// RCON connect request schema
const rconConnectRequestSchema = protocolRequestSchema.extend({
  password: z.string(),
  uri: z.string().optional()
});

// RCON connect response schema
const rconConnectResponseSchema = protocolRequestSchema.extend({
  success: z.boolean(),
  error: z.string().optional()
});

// Complete schema definition for RCON server plugin
export const rconServerSchemas = {
  send: {
    '/rcon/connect/response': rconConnectResponseSchema
  },
  receive: {
    '/rcon/connect/request': rconConnectRequestSchema
  },
  publish: {},
  subscribe: {},
  emit: {}
} as const;

// Export individual schemas for reuse
export {
  rconConnectRequestSchema,
  rconConnectResponseSchema
};