import { z } from 'zod';
import type {
  SchemaRegistryInterface,
  RegisteredSchema,
  Migration,
  MigrationFunction,
  SchemaVersion,
} from './types.js';

export class SchemaRegistry implements SchemaRegistryInterface {
  private schemas = new Map<string, Map<number, RegisteredSchema>>();
  private migrations = new Map<string, Map<string, Migration>>();

  registerSchema<TSchema extends z.ZodSchema>(
    schemaId: string,
    version: number,
    schemaVersion: SchemaVersion<TSchema>
  ): this {
    if (!this.schemas.has(schemaId)) {
      this.schemas.set(schemaId, new Map());
    }

    const schemaVersions = this.schemas.get(schemaId)!;
    
    if (schemaVersions.has(version)) {
      throw new Error(
        `Schema "${schemaId}" version ${version} is already registered`
      );
    }

    schemaVersions.set(version, {
      schemaId,
      version,
      schema: schemaVersion.schema,
      indexes: schemaVersion.indexes,
      aggregate: schemaVersion.aggregate,
      rollup: schemaVersion.rollup,
      searchOptions: schemaVersion.searchOptions,
    });

    return this;
  }

  registerMigration<TFrom = unknown, TTo = unknown>(
    schemaId: string,
    fromVersion: number,
    toVersion: number,
    migrate: MigrationFunction<TFrom, TTo>
  ): this {
    if (!this.migrations.has(schemaId)) {
      this.migrations.set(schemaId, new Map());
    }

    const schemaMigrations = this.migrations.get(schemaId)!;
    const migrationKey = `${fromVersion}->${toVersion}`;

    if (schemaMigrations.has(migrationKey)) {
      throw new Error(
        `Migration for "${schemaId}" from version ${fromVersion} to ${toVersion} is already registered`
      );
    }

    schemaMigrations.set(migrationKey, {
      schemaId,
      fromVersion,
      toVersion,
      migrate: migrate as MigrationFunction,
    });

    return this;
  }

  getSchema(schemaId: string, version: number): RegisteredSchema | undefined {
    return this.schemas.get(schemaId)?.get(version);
  }

  getLatestSchema(schemaId: string): RegisteredSchema | undefined {
    const versions = this.schemas.get(schemaId);
    if (!versions || versions.size === 0) {
      return undefined;
    }

    const latestVersion = Math.max(...versions.keys());
    return versions.get(latestVersion);
  }

  getLatestVersion(schemaId: string): number | undefined {
    const versions = this.schemas.get(schemaId);
    if (!versions || versions.size === 0) {
      return undefined;
    }

    return Math.max(...versions.keys());
  }

  async migrate<T = unknown>(
    schemaId: string,
    data: unknown,
    fromVersion: number,
    toVersion?: number
  ): Promise<T> {
    const targetVersion = toVersion ?? this.getLatestVersion(schemaId);
    
    if (targetVersion === undefined) {
      throw new Error(`No schemas registered for "${schemaId}"`);
    }

    if (fromVersion === targetVersion) {
      return data as T;
    }

    let currentData = data;
    let currentVersion = fromVersion;

    // Build migration path
    const migrationPath: Migration[] = [];
    
    while (currentVersion < targetVersion) {
      const nextVersion = currentVersion + 1;
      const migrationKey = `${currentVersion}->${nextVersion}`;
      const migration = this.migrations.get(schemaId)?.get(migrationKey);

      if (!migration) {
        throw new Error(
          `No migration found for "${schemaId}" from version ${currentVersion} to ${nextVersion}`
        );
      }

      migrationPath.push(migration);
      currentVersion = nextVersion;
    }

    // Execute migrations
    for (const migration of migrationPath) {
      currentData = await migration.migrate(currentData);
    }

    // Validate against target schema
    const targetSchema = this.getSchema(schemaId, targetVersion);
    if (targetSchema) {
      const result = targetSchema.schema.safeParse(currentData);
      if (!result.success) {
        throw new Error(
          `Migration to "${schemaId}" version ${targetVersion} failed validation: ${result.error.message}`
        );
      }
      currentData = result.data;
    }

    return currentData as T;
  }

  validate(
    schemaId: string,
    version: number,
    data: unknown
  ): { success: true; data: unknown } | { success: false; error: z.ZodError } {
    const schema = this.getSchema(schemaId, version);
    
    if (!schema) {
      throw new Error(`Schema "${schemaId}" version ${version} not found`);
    }

    const result = schema.schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error };
    }
  }

  getAllSchemas(): Map<string, Map<number, RegisteredSchema>> {
    return new Map(this.schemas);
  }

  getAllMigrations(): Migration[] {
    const allMigrations: Migration[] = [];
    
    for (const schemaMigrations of this.migrations.values()) {
      allMigrations.push(...schemaMigrations.values());
    }
    
    return allMigrations;
  }
}

export function createSchemaRegistry(): SchemaRegistry {
  return new SchemaRegistry();
}