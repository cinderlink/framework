import type { SchemaRegistryInterface } from '@cinderlink/schema-registry';
import * as v1 from './v1.js';

export const SCHEMA_ID = 'social.users';

export function register(registry: SchemaRegistryInterface): void {
  registry.registerSchema(SCHEMA_ID, 1, {
    schema: v1.schema,
    indexes: {
      did: { fields: ['did'], unique: true },
      username: { fields: ['username'], unique: true },
    },
    rollup: 100,
    searchOptions: {
      fields: ['username', 'did'],
      storeFields: ['username', 'did', 'id'],
    },
  });
}

// Export types for convenience
export type { UserV1 } from './v1.js';
export type User = v1.UserV1; // Current version alias