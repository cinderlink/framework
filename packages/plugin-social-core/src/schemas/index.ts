import type { SchemaRegistryInterface } from '@cinderlink/schema-registry';
import * as users from './users/index.js';

export function registerSocialSchemas(registry: SchemaRegistryInterface): void {
  users.register(registry);
  // Future: profiles.register(registry);
  // Future: posts.register(registry);
  // Future: comments.register(registry);
  // Future: reactions.register(registry);
  // Future: chatMessages.register(registry);
}

// Export all schema IDs
export const SCHEMA_IDS = {
  users: users.SCHEMA_ID,
  // Future: profiles: profiles.SCHEMA_ID,
  // Future: posts: posts.SCHEMA_ID,
  // Future: comments: comments.SCHEMA_ID,
  // Future: reactions: reactions.SCHEMA_ID,
  // Future: chatMessages: chatMessages.SCHEMA_ID,
} as const;

// Re-export types
export type { User, UserV1 } from './users/index.js';