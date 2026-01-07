import { describe, beforeEach, afterEach, vi, expect } from 'vitest';
import { TestClient, TestDIDDag, TestLogger } from '@cinderlink/test-adapters';
import { createSeed, createDID } from '@cinderlink/identifiers';
import { Schema } from '../schema.js';
import { Table } from '../table.js';
import { TableDefinition, TableRow } from '@cinderlink/core-types';
import type { DID } from 'dids';

export interface TestTableRow extends TableRow {
  id: number;
  uid: string;
  name: string;
  count: number;
  email?: string;
  active?: boolean;
}

export class IPLDDatabaseTestUtils {
  private static cleanup: Array<() => void | Promise<void>> = [];

  static setupTestEnvironment() {
    beforeEach(() => {
      // Reset cleanup array
      this.cleanup = [];
    });

    afterEach(async () => {
      // Run all cleanup functions
      await Promise.all(this.cleanup.map(fn => fn()));
      this.cleanup = [];
    });
  }

  static addCleanup(fn: () => void | Promise<void>) {
    this.cleanup.push(fn);
  }

  static async createTestDID(): Promise<DID> {
    const seed = await createSeed(`test-${Date.now()}-${Math.random()}`);
    return await createDID(seed);
  }

  static async createTestSchema(
    schemaId = 'test',
    tableDefs?: Record<string, TableDefinition<any>>
  ): Promise<{
    did: DID;
    dag: TestDIDDag;
    logger: TestLogger;
    schema: Schema;
  }> {
    const did = await this.createTestDID();
    const dag = new TestDIDDag(did);
    const logger = new TestLogger();
    const subLogger = logger.module('db').submodule(`schema:${schemaId}`);

    const defaultTableDef: TableDefinition<TestTableRow> = {
      schemaId,
      encrypted: false,
      indexes: {
        name: {
          unique: true,
          fields: ['name'],
        },
        email: {
          unique: false,
          fields: ['email'],
        }
      },
      aggregate: {
        count: 'max',
        active: 'count'
      },
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          count: { type: 'number' },
          email: { type: 'string' },
          active: { type: 'boolean' }
        },
      },
      searchOptions: {
        fields: ['name', 'email', 'id'],
      },
      rollup: 10,
    };

    const tables = tableDefs || { [schemaId]: defaultTableDef };
    const schema = new Schema(schemaId, tables, dag, subLogger, false);

    this.addCleanup(() => {
      // Cleanup any resources if needed
    });

    return { did, dag, logger, schema };
  }

  static async createTestTable(
    tableName = 'test',
    schemaId = 'test-schema'
  ): Promise<{
    table: Table<TestTableRow>;
    schema: Schema;
    dag: TestDIDDag;
    logger: TestLogger;
  }> {
    const { schema, dag, logger } = await this.createTestSchema(schemaId);
    const table = schema.tables[tableName] as Table<TestTableRow>;
    
    return { table, schema, dag, logger };
  }

  static generateTestRecords(count: number): Partial<TestTableRow>[] {
    return Array.from({ length: count }, (_, i) => ({
      name: `test-record-${i}`,
      count: i,
      email: `test${i}@example.com`,
      active: i % 2 === 0
    }));
  }

  static async insertTestRecords(
    table: Table<TestTableRow>, 
    count: number
  ): Promise<TestTableRow[]> {
    const records = this.generateTestRecords(count);
    const inserted: TestTableRow[] = [];
    
    for (const record of records) {
      const insertedRecord = await table.insert(record);
      inserted.push(insertedRecord);
    }
    
    return inserted;
  }

  static async assertRecordExists(
    table: Table<TestTableRow>,
    field: keyof TestTableRow,
    value: any
  ) {
    const result = await table.query()
      .where(field as string, '=', value)
      .select()
      .execute();
    
    expect(result.results).toHaveLength(1);
    expect(result.first()).toBeDefined();
    return result.first()!;
  }

  static async assertRecordCount(
    table: Table<TestTableRow>,
    expectedCount: number
  ) {
    const result = await table.query().select().execute();
    expect(result.results).toHaveLength(expectedCount);
  }

  static async waitForAsyncOperation(ms = 100) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  static createMockTableDefinition(
    overrides: Partial<TableDefinition<TestTableRow>> = {}
  ): TableDefinition<TestTableRow> {
    return {
      schemaId: 'mock-test',
      encrypted: false,
      indexes: {
        name: {
          unique: true,
          fields: ['name'],
        }
      },
      aggregate: {
        count: 'sum'
      },
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          count: { type: 'number' }
        },
      },
      searchOptions: {
        fields: ['name'],
      },
      rollup: 5,
      ...overrides
    };
  }

  static async assertSchemaIntegrity(schema: Schema) {
    expect(schema.name).toBeDefined();
    expect(schema.tables).toBeDefined();
    expect(Object.keys(schema.tables).length).toBeGreaterThan(0);
    
    // Check each table has required properties
    for (const [tableName, table] of Object.entries(schema.tables)) {
      expect(table).toBeDefined();
      expect(table.definition).toBeDefined();
      expect(table.currentBlock).toBeDefined();
    }
  }

  static async createConcurrentOperations<T>(
    operations: Array<() => Promise<T>>,
    concurrency = 3
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }
    
    return results;
  }
}

// Test data constants
export const TEST_RECORDS = {
  user1: { name: 'Alice', count: 1, email: 'alice@example.com', active: true },
  user2: { name: 'Bob', count: 2, email: 'bob@example.com', active: false },
  user3: { name: 'Charlie', count: 3, email: 'charlie@example.com', active: true },
  user4: { name: 'Diana', count: 4, email: 'diana@example.com', active: false },
  user5: { name: 'Eve', count: 5, email: 'eve@example.com', active: true }
};

export const TEST_TABLE_DEFINITIONS = {
  users: {
    schemaId: 'users',
    encrypted: false,
    indexes: {
      email: { unique: true, fields: ['email'] },
      name: { unique: false, fields: ['name'] }
    },
    aggregate: {
      count: 'sum',
      active: 'count'
    },
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        count: { type: 'number' },
        active: { type: 'boolean' }
      }
    },
    searchOptions: {
      fields: ['name', 'email']
    },
    rollup: 5
  } as TableDefinition<TestTableRow>,
  
  posts: {
    schemaId: 'posts',
    encrypted: true,
    indexes: {
      title: { unique: false, fields: ['title'] }
    },
    aggregate: {
      views: 'sum'
    },
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        content: { type: 'string' },
        views: { type: 'number' }
      }
    },
    searchOptions: {
      fields: ['title', 'content']
    },
    rollup: 20
  } as TableDefinition<any>
};