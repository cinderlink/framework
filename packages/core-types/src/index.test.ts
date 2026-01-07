import { describe, it, expect } from 'bun:test';
import { 
  type TableRow,
  type TableDefinition,
  type SyncConfig,
  type PluginEventDef,
  type CinderlinkClientInterface 
} from './index';

describe('As a developer using Cinderlink types', () => {
  it('I want to use table row types to define my data structures', () => {
    const tableRow: TableRow = {
      id: 1,
      uid: 'test-uid',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
 
    expect(tableRow.id).toBe(1);
    expect(tableRow.uid).toBe('test-uid');
    expect(typeof tableRow.createdAt).toBe('number');
    expect(typeof tableRow.updatedAt).toBe('number');
  });
 
  it('I want to define table schemas with proper structure', () => {
    interface TestRow extends TableRow {
      name: string;
      count: number;
    }
 
    const tableDef: TableDefinition<TestRow> = {
      schemaId: 'test',
      schemaVersion: 1,
      encrypted: false,
      rollup: 10,
      aggregate: {},
      searchOptions: {
        fields: ['name']
      },
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          count: { type: 'number' }
        }
      },
      indexes: {
        name: {
          unique: true,
          fields: ['name']
        }
      }
    };
 
    expect(tableDef.schemaId).toBe('test');
    expect(tableDef.schemaVersion).toBe(1);
    expect(tableDef.encrypted).toBe(false);
    expect(tableDef.rollup).toBe(10);
    expect(tableDef.schema?.type).toBe('object');
  });
 
  it('I want to define plugin events for inter-component communication', () => {
    interface TestEvents extends PluginEventDef {
      send: {
        '/test/request': { message: string };
      };
      receive: {
        '/test/response': { result: string };
      };
      emit: {
        '/test/event': { data: unknown };
      };
    }
 
    const eventTest: TestEvents['send']['/test/request'] = { message: 'hello' };
    expect(eventTest.message).toBe('hello');
  });
});