import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { createSchemaRegistry } from './registry.js';

describe('SchemaRegistry', () => {
  let registry: ReturnType<typeof createSchemaRegistry>;

  beforeEach(() => {
    registry = createSchemaRegistry();
  });

  describe('schema registration', () => {
    it('should register a schema', () => {
      const userSchema = z.object({
        id: z.number(),
        name: z.string(),
      });

      registry.registerSchema('users', 1, { schema: userSchema });

      const retrieved = registry.getSchema('users', 1);
      expect(retrieved).toBeDefined();
      expect(retrieved?.schemaId).toBe('users');
      expect(retrieved?.version).toBe(1);
    });

    it('should register schema with metadata', () => {
      const userSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
      });

      registry.registerSchema('users', 1, {
        schema: userSchema,
        indexes: {
          email: { fields: ['email'], unique: true },
        },
        aggregate: {
          id: 'max',
        },
        rollup: 100,
        searchOptions: {
          fields: ['name', 'email'],
        },
      });

      const retrieved = registry.getSchema('users', 1);
      expect(retrieved?.indexes).toEqual({
        email: { fields: ['email'], unique: true },
      });
      expect(retrieved?.aggregate).toEqual({ id: 'max' });
      expect(retrieved?.rollup).toBe(100);
    });

    it('should throw on duplicate registration', () => {
      const schema = z.object({ id: z.number() });
      
      registry.registerSchema('users', 1, { schema });
      
      expect(() => {
        registry.registerSchema('users', 1, { schema });
      }).toThrow('Schema "users" version 1 is already registered');
    });

    it('should get latest schema', () => {
      const v1 = z.object({ id: z.number() });
      const v2 = z.object({ id: z.number(), name: z.string() });
      const v3 = z.object({ id: z.number(), name: z.string(), email: z.string() });

      registry
        .registerSchema('users', 1, { schema: v1 })
        .registerSchema('users', 3, { schema: v3 })
        .registerSchema('users', 2, { schema: v2 });

      const latest = registry.getLatestSchema('users');
      expect(latest?.version).toBe(3);
    });
  });

  describe('migrations', () => {
    beforeEach(() => {
      const v1 = z.object({
        id: z.number(),
        name: z.string(),
      });

      const v2 = z.object({
        id: z.number(),
        name: z.string(),
        displayName: z.string(),
      });

      const v3 = z.object({
        id: z.number(),
        name: z.string(),
        displayName: z.string(),
        createdAt: z.number(),
      });

      registry
        .registerSchema('users', 1, { schema: v1 })
        .registerSchema('users', 2, { schema: v2 })
        .registerSchema('users', 3, { schema: v3 })
        .registerMigration('users', 1, 2, (data: any) => ({
          ...data,
          displayName: data.name,
        }))
        .registerMigration('users', 2, 3, (data: any) => ({
          ...data,
          createdAt: Date.now(),
        }));
    });

    it('should migrate data through versions', async () => {
      const v1Data = { id: 1, name: 'John' };
      
      const v3Data = await registry.migrate('users', v1Data, 1, 3);
      
      expect(v3Data).toMatchObject({
        id: 1,
        name: 'John',
        displayName: 'John',
        createdAt: expect.any(Number),
      });
    });

    it('should migrate to latest version by default', async () => {
      const v1Data = { id: 1, name: 'Jane' };
      
      const latestData = await registry.migrate('users', v1Data, 1);
      
      expect(latestData).toMatchObject({
        id: 1,
        name: 'Jane',
        displayName: 'Jane',
        createdAt: expect.any(Number),
      });
    });

    it('should throw on missing migration', async () => {
      const v1Data = { id: 1, name: 'John' };
      
      // Remove v2->v3 migration to create a gap
      registry = createSchemaRegistry();
      registry
        .registerSchema('users', 1, { schema: z.object({ id: z.number() }) })
        .registerSchema('users', 3, { schema: z.object({ id: z.number() }) })
        .registerMigration('users', 1, 2, (data) => data);

      await expect(
        registry.migrate('users', v1Data, 1, 3)
      ).rejects.toThrow('No migration found for "users" from version 2 to 3');
    });
  });

  describe('validation', () => {
    it('should validate data against schema', () => {
      const schema = z.object({
        id: z.number(),
        email: z.string().email(),
      });

      registry.registerSchema('users', 1, { schema });

      const validResult = registry.validate('users', 1, {
        id: 1,
        email: 'test@example.com',
      });

      expect(validResult.success).toBe(true);
      if (validResult.success) {
        expect(validResult.data).toEqual({
          id: 1,
          email: 'test@example.com',
        });
      }

      const invalidResult = registry.validate('users', 1, {
        id: 'not-a-number',
        email: 'not-an-email',
      });

      expect(invalidResult.success).toBe(false);
    });
  });
});