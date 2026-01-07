/**
 * Database Hook
 *
 * Provides access to IPLD database schemas and tables from the Cinderlink client.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CinderlinkClientInterface } from '@cinderlink/core-types';

export interface DatabaseNode {
  path: string;
  content: unknown;
  schema?: string;
  table?: string;
  previousContent?: unknown;
}

export interface SchemaInfo {
  id: string;
  tables: string[];
}

export interface TableInfo {
  schemaId: string;
  tableId: string;
  recordCount: number;
  encrypted: boolean;
}

export interface DatabaseStats {
  schemaCount: number;
  tableCount: number;
  totalRecords: number;
}

interface UseDatabaseReturn {
  nodes: DatabaseNode[];
  schemas: SchemaInfo[];
  tables: TableInfo[];
  stats: DatabaseStats;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  queryTable: (schemaId: string, tableId: string, limit?: number) => Promise<DatabaseNode[]>;
  isRealDatabase: boolean;
}

/**
 * Hook to access Cinderlink IPLD database
 */
export function useDatabase(client?: CinderlinkClientInterface): UseDatabaseReturn {
  const [nodes, setNodes] = useState<DatabaseNode[]>([]);
  const [schemas, setSchemas] = useState<SchemaInfo[]>([]);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRealDatabase = useMemo(() => !!client && Object.keys(client.schemas || {}).length > 0, [client]);

  const stats = useMemo((): DatabaseStats => {
    return {
      schemaCount: schemas.length,
      tableCount: tables.length,
      totalRecords: tables.reduce((sum, t) => sum + t.recordCount, 0),
    };
  }, [schemas, tables]);

  /**
   * Load all schemas and tables from client
   */
  const loadSchemas = useCallback(async () => {
    if (!client?.schemas) {
      return;
    }

    const schemaList: SchemaInfo[] = [];
    const tableList: TableInfo[] = [];

    for (const [schemaId, schema] of Object.entries(client.schemas)) {
      const tableNames = Object.keys(schema.tables || {});
      schemaList.push({
        id: schemaId,
        tables: tableNames,
      });

      // Get info for each table
      for (const tableId of tableNames) {
        const table = schema.tables[tableId];
        if (table) {
          try {
            // Get record count from current block
            const records = await table.currentBlock?.records();
            const recordCount = records ? Object.keys(records).length : 0;

            tableList.push({
              schemaId,
              tableId,
              recordCount,
              encrypted: table.encrypted || false,
            });
          } catch (err) {
            console.error(`Failed to get info for table ${schemaId}.${tableId}:`, err);
            tableList.push({
              schemaId,
              tableId,
              recordCount: 0,
              encrypted: false,
            });
          }
        }
      }
    }

    setSchemas(schemaList);
    setTables(tableList);
  }, [client]);

  /**
   * Query records from a specific table
   */
  const queryTable = useCallback(async (
    schemaId: string,
    tableId: string,
    limit = 100
  ): Promise<DatabaseNode[]> => {
    if (!client?.schemas) {
      return [];
    }

    const schema = client.schemas[schemaId];
    if (!schema) {
      console.warn(`Schema "${schemaId}" not found`);
      return [];
    }

    const table = schema.tables[tableId];
    if (!table) {
      console.warn(`Table "${tableId}" not found in schema "${schemaId}"`);
      return [];
    }

    try {
      // Query records from the table
      const results = await table.query().limit(limit).toArray();

      return results.map((record, index) => ({
        path: `/${schemaId}/${tableId}/${record.uid || record.id || index}`,
        content: record,
        schema: schemaId,
        table: tableId,
      }));
    } catch (err) {
      console.error(`Failed to query table ${schemaId}.${tableId}:`, err);
      return [];
    }
  }, [client]);

  /**
   * Refresh all database data
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await loadSchemas();

      // Load initial nodes from all tables
      const allNodes: DatabaseNode[] = [];

      if (client?.schemas) {
        for (const [schemaId, schema] of Object.entries(client.schemas)) {
          for (const tableId of Object.keys(schema.tables || {})) {
            try {
              const tableNodes = await queryTable(schemaId, tableId, 50);
              allNodes.push(...tableNodes);
            } catch (err) {
              console.error(`Failed to load nodes from ${schemaId}.${tableId}:`, err);
            }
          }
        }
      }

      setNodes(allNodes);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      console.error('Failed to refresh database:', err);
    } finally {
      setLoading(false);
    }
  }, [client, loadSchemas, queryTable]);

  // Load data when client changes
  useEffect(() => {
    if (client) {
      refresh();
    } else {
      // Set mock data when no client
      setSchemas([]);
      setTables([]);
      setNodes([
        {
          path: '/demo/profiles/alice',
          content: { name: 'Alice', bio: 'Demo user profile' },
          schema: 'demo',
          table: 'profiles',
        },
        {
          path: '/demo/posts/welcome',
          content: { title: 'Welcome', body: 'This is demo data. Connect a real client to see actual database.', author: 'alice' },
          schema: 'demo',
          table: 'posts',
        },
      ]);
    }
  }, [client, refresh]);

  // Subscribe to table events for real-time updates
  useEffect(() => {
    if (!client?.schemas) {
      return;
    }

    const unsubscribers: (() => void)[] = [];

    for (const [schemaId, schema] of Object.entries(client.schemas)) {
      for (const [tableId, table] of Object.entries(schema.tables || {})) {
        // Listen for record changes
        const handleInsert = () => {
          // Refresh the specific table's nodes
          queryTable(schemaId, tableId).then(tableNodes => {
            setNodes(prev => {
              // Remove old nodes from this table and add new ones
              const filtered = prev.filter(n => !(n.schema === schemaId && n.table === tableId));
              return [...filtered, ...tableNodes];
            });
          });
        };

        const handleUpdate = handleInsert;
        const handleDelete = handleInsert;

        table.on('/record/inserted', handleInsert);
        table.on('/record/updated', handleUpdate);
        table.on('/record/deleted', handleDelete);

        unsubscribers.push(() => {
          table.off('/record/inserted', handleInsert);
          table.off('/record/updated', handleUpdate);
          table.off('/record/deleted', handleDelete);
        });
      }
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [client, queryTable]);

  return {
    nodes,
    schemas,
    tables,
    stats,
    loading,
    error,
    refresh,
    queryTable,
    isRealDatabase,
  };
}
