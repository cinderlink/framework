export { SchemaRegistry, createSchemaRegistry } from './registry.js';
export type {
  SchemaRegistryInterface,
  RegisteredSchema,
  Migration,
  MigrationFunction,
  SchemaVersion,
  SchemaIndexes,
  SchemaAggregates,
  SearchOptions,
} from './types.js';

// Re-export zod for convenience
export { z } from 'zod';