import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDatabase } from './useDatabase';
import type { CinderlinkClientInterface } from '@cinderlink/core-types';

// Mock client factory
function createMockClient(schemas: Record<string, unknown> = {}): Partial<CinderlinkClientInterface> {
  return {
    schemas: schemas as CinderlinkClientInterface['schemas'],
  };
}

// Mock table with records
function createMockTable(records: Record<number, unknown> = {}) {
  const mockBlock = {
    records: vi.fn().mockResolvedValue(records),
  };
  
  const mockQuery = {
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue(Object.values(records)),
  };

  return {
    currentBlock: mockBlock,
    encrypted: false,
    query: vi.fn().mockReturnValue(mockQuery),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe('useDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns demo data when no client is provided', async () => {
    const { result } = renderHook(() => useDatabase(undefined));

    await waitFor(() => {
      expect(result.current.nodes.length).toBeGreaterThan(0);
    });

    expect(result.current.isRealDatabase).toBe(false);
    expect(result.current.nodes[0].schema).toBe('demo');
  });

  it('returns empty stats when no client', () => {
    const { result } = renderHook(() => useDatabase(undefined));

    expect(result.current.stats.schemaCount).toBe(0);
    expect(result.current.stats.tableCount).toBe(0);
  });

  it('loads schemas from real client', async () => {
    const mockTable = createMockTable({
      1: { id: 1, uid: 'user-1', name: 'Alice' },
      2: { id: 2, uid: 'user-2', name: 'Bob' },
    });

    const mockClient = createMockClient({
      'social': {
        tables: {
          'profiles': mockTable,
        },
      },
    });

    const { result } = renderHook(() => 
      useDatabase(mockClient as CinderlinkClientInterface)
    );

    await waitFor(() => {
      expect(result.current.schemas.length).toBeGreaterThan(0);
    });

    expect(result.current.isRealDatabase).toBe(true);
    expect(result.current.schemas[0].id).toBe('social');
    expect(result.current.schemas[0].tables).toContain('profiles');
  });

  it('queries table records', async () => {
    const records = {
      1: { id: 1, uid: 'post-1', title: 'Hello' },
      2: { id: 2, uid: 'post-2', title: 'World' },
    };

    const mockTable = createMockTable(records);

    const mockClient = createMockClient({
      'blog': {
        tables: {
          'posts': mockTable,
        },
      },
    });

    const { result } = renderHook(() => 
      useDatabase(mockClient as CinderlinkClientInterface)
    );

    await waitFor(() => {
      expect(result.current.nodes.length).toBeGreaterThan(0);
    });

    // Check nodes were loaded
    expect(result.current.nodes.some(n => n.path.includes('blog/posts'))).toBe(true);
  });

  it('calculates stats correctly', async () => {
    const mockTable1 = createMockTable({
      1: { id: 1, uid: 'a' },
      2: { id: 2, uid: 'b' },
    });

    const mockTable2 = createMockTable({
      1: { id: 1, uid: 'c' },
    });

    const mockClient = createMockClient({
      'schema1': {
        tables: {
          'table1': mockTable1,
          'table2': mockTable2,
        },
      },
    });

    const { result } = renderHook(() => 
      useDatabase(mockClient as CinderlinkClientInterface)
    );

    await waitFor(() => {
      expect(result.current.tables.length).toBe(2);
    });

    expect(result.current.stats.schemaCount).toBe(1);
    expect(result.current.stats.tableCount).toBe(2);
  });

  it('provides refresh function', async () => {
    const mockTable = createMockTable({ 1: { id: 1, uid: 'x' } });

    const mockClient = createMockClient({
      'test': {
        tables: {
          'data': mockTable,
        },
      },
    });

    const { result } = renderHook(() => 
      useDatabase(mockClient as CinderlinkClientInterface)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Call refresh
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeNull();
  });

  it('handles errors gracefully', async () => {
    const mockTable = {
      currentBlock: {
        records: vi.fn().mockRejectedValue(new Error('DB error')),
      },
      encrypted: false,
      query: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnThis(),
        toArray: vi.fn().mockRejectedValue(new Error('Query error')),
      }),
      on: vi.fn(),
      off: vi.fn(),
    };

    const mockClient = createMockClient({
      'broken': {
        tables: {
          'bad': mockTable,
        },
      },
    });

    const { result } = renderHook(() => 
      useDatabase(mockClient as CinderlinkClientInterface)
    );

    // Should not crash, just have empty/default data
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
