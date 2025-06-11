import type { z } from 'zod';

export interface SchemaVersion<TSchema extends z.ZodSchema = z.ZodSchema> {
  schema: TSchema;
  indexes?: SchemaIndexes;
  aggregate?: SchemaAggregates;
  rollup?: number;
  searchOptions?: SearchOptions;
}

export interface SchemaIndexes {
  [indexName: string]: {
    fields: string[];
    unique?: boolean;
  };
}

export interface SchemaAggregates {
  [fieldName: string]: 'max' | 'min' | 'sum' | 'count' | 'avg' | 'range';
}

export interface SearchOptions {
  fields?: string[];
  storeFields?: string[];
  idField?: string;
}

export type MigrationFunction<TFrom = unknown, TTo = unknown> = (
  data: TFrom
) => TTo | Promise<TTo>;

export interface RegisteredSchema {
  schemaId: string;
  version: number;
  schema: z.ZodSchema;
  indexes?: SchemaIndexes;
  aggregate?: SchemaAggregates;
  rollup?: number;
  searchOptions?: SearchOptions;
}

export interface Migration {
  schemaId: string;
  fromVersion: number;
  toVersion: number;
  migrate: MigrationFunction;
}

export interface SchemaRegistryInterface {
  registerSchema<TSchema extends z.ZodSchema>(
    schemaId: string,
    version: number,
    schemaVersion: SchemaVersion<TSchema>
  ): this;
  
  registerMigration<TFrom = unknown, TTo = unknown>(
    schemaId: string,
    fromVersion: number,
    toVersion: number,
    migrate: MigrationFunction<TFrom, TTo>
  ): this;
  
  getSchema(schemaId: string, version: number): RegisteredSchema | undefined;
  
  getLatestSchema(schemaId: string): RegisteredSchema | undefined;
  
  getLatestVersion(schemaId: string): number | undefined;
  
  migrate<T = unknown>(
    schemaId: string,
    data: unknown,
    fromVersion: number,
    toVersion?: number
  ): Promise<T>;
  
  validate(
    schemaId: string,
    version: number,
    data: unknown
  ): { success: true; data: unknown } | { success: false; error: z.ZodError };
  
  getAllSchemas(): Map<string, Map<number, RegisteredSchema>>;
  
  getAllMigrations(): Migration[];
}