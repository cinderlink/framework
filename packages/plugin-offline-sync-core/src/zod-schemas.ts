import { z } from '@cinderlink/schema-registry';

// Offline Sync Messages Schema
export const OfflineSyncMessagesSchema = z.object({
  sender: z.string(),
  recipient: z.string(),
  message: z.object({}).passthrough(), // Allow any message object properties
  updatedAt: z.number(),
  deliveredAt: z.number(),
  attemptedAt: z.number(),
  attempts: z.number(),
});

// Schema registry entries
export const offlineSyncSchemas = {
  messages: { schema: OfflineSyncMessagesSchema, version: 1 },
} as const;