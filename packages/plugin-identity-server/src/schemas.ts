import { z } from 'zod';

// Base protocol request schema
const protocolRequestSchema = z.object({
  timestamp: z.number(),
  requestId: z.string()
});

// Identity resolve request schema
const identityResolveRequestSchema = protocolRequestSchema.extend({
  since: z.number()
});

// Identity resolve response schema  
const identityResolveResponseSchema = protocolRequestSchema.extend({
  cid: z.string().optional(),
  doc: z.record(z.string(), z.unknown()).optional(),
  error: z.string().optional()
});

// Identity set request schema
const identitySetRequestSchema = protocolRequestSchema.extend({
  cid: z.string(),
  buffer: z.string().optional()
});

// Identity set response schema
const identitySetResponseSchema = protocolRequestSchema.extend({
  success: z.boolean(),
  error: z.string().optional()
});

// Complete schema definition for identity server plugin
export const identityServerSchemas = {
  send: {
    '/identity/resolve/response': identityResolveResponseSchema,
    '/identity/set/response': identitySetResponseSchema
  },
  receive: {
    '/identity/set/request': identitySetRequestSchema,
    '/identity/resolve/request': identityResolveRequestSchema
  },
  publish: {},
  subscribe: {},
  emit: {}
} as const;

// Export individual schemas for reuse
export {
  identityResolveRequestSchema,
  identityResolveResponseSchema,
  identitySetRequestSchema,
  identitySetResponseSchema
};