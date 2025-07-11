import { TableDefinition } from "@cinderlink/core-types";
import {
  BlockData,
  QueryResult,
  TableBlockInterface,
  TableQueryInterface,
  TableRow,
} from "@cinderlink/core-types";

import sizeof from "object-sizeof";
import * as json from "multiformats/codecs/json";
import { base58btc } from "multiformats/bases/base58";

export class DatabaseCache implements DatabaseCacheInterface {
  currentBlockCacheSize = 0;
  currentQueryCacheSize = 0;

  blocks: Record<
    string,
    {
      table: string;
      age: number;
      reads: number;
      block: BlockData;
    }
  > = {};

  queries: Record<
    string,
    {
      table: string;
      age: number;
      reads: number;
      result: QueryResult;
    }
  > = {};

  constructor(
    public maxBlockCacheSize = 100000,
    public maxQueryCacheSize = 100000
  ) {}

  hasBlock(cid: string): boolean {
    return !!this.blocks[cid];
  }

  getBlock(cid: string): BlockData {
    return this.blocks[cid].block;
  }

  cacheBlock(block: TableBlockInterface<any, any>): void {
    if (!block.cid || !block.cache) {
      return;
    }
    const size = this.calculateBlockCacheSize(block);
    if (size > this.maxBlockCacheSize) return;
    this.removeBlocksToSize(this.currentBlockCacheSize + size);
    this.blocks[block.cid.toString()] = {
      table: block.table.tableId,
      age: Date.now(),
      reads: 0,
      block: block.cache as BlockData,
    };
    this.currentBlockCacheSize += size;
  }

  removeBlock(cid: string): void {
    const block = this.blocks[cid];
    if (!block) return;
    this.currentBlockCacheSize -= sizeof(block);
    delete this.blocks[cid];
  }

  calculateBlockCacheSize(block: TableBlockInterface): number {
    return sizeof(block.cache as BlockData);
  }

  removeOldestBlock(): void {
    const oldest = Object.entries(this.blocks).reduce(
      (acc, [cid, block]) => {
        if (!acc || block.age < acc.age) {
          return {
            cid,
            age: block.age,
          };
        }
        return acc;
      },
      { cid: "", age: 0 }
    );
    this.removeBlock(oldest.cid);
  }

  removeLeastReadBlock(): void {
    const leastRead = Object.entries(this.blocks).reduce(
      (acc, [cid, block]) => {
        if (!acc || block.reads < acc.reads) {
          return {
            cid,
            reads: block.reads,
          };
        }
        return acc;
      },
      { cid: "", reads: 0 }
    );
    this.removeBlock(leastRead.cid);
  }

  removeBlocksToSize(
    size: number,
    method: "age" | "popularity" = "popularity"
  ): void {
    while (this.currentBlockCacheSize > size) {
      method === "popularity"
        ? this.removeLeastReadBlock()
        : this.removeOldestBlock();
    }
  }

  serializeQuery<Row extends TableRow = TableRow>(
    query: TableQueryInterface<Row>
  ): string {
    return base58btc.encode(
      json.encode({
        table: query.table.tableId,
        query: query.instructions,
      })
    );
  }

  hasQuery<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(query: TableQueryInterface<Row, Def>): boolean {
    return !!this.queries[this.serializeQuery(query)];
  }

  getQuery<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(query: TableQueryInterface<Row, Def>): QueryResult {
    return this.queries[this.serializeQuery(query)].result;
  }

  cacheQuery(query: TableQueryInterface, result: QueryResult): void {
    const size = this.calculateQueryCacheSize(result);
    if (size > this.maxQueryCacheSize) return;
    this.removeQueriesToSize(this.currentQueryCacheSize + size);
    this.queries[this.serializeQuery(query)] = {
      table: query.table.tableId,
      age: Date.now(),
      reads: 0,
      result,
    };
    this.currentQueryCacheSize += size;
  }

  removeQuery(query: TableQueryInterface): void {
    const queryStr = this.serializeQuery(query);
    return this.removeQueryById(queryStr);
  }

  removeQueryById(queryId: string): void {
    const queryData = this.queries[queryId];
    if (!queryData) return;
    this.currentQueryCacheSize -= this.calculateQueryCacheSize(
      queryData.result
    );
    delete this.queries[queryId];
  }

  calculateQueryCacheSize(result: QueryResult): number {
    return sizeof(result);
  }

  removeOldestQuery(): void {
    const oldest = Object.entries(this.queries).reduce(
      (acc, [query, queryData]) => {
        if (!acc || queryData.age < acc.age) {
          return {
            query,
            age: queryData.age,
          };
        }
        return acc;
      },
      { query: "", age: 0 }
    );
    this.removeQuery(JSON.parse(oldest.query));
  }

  removeLeastReadQuery(): void {
    const leastRead = Object.entries(this.queries).reduce(
      (acc, [query, queryData]) => {
        if (!acc || queryData.reads < acc.reads) {
          return {
            query,
            reads: queryData.reads,
          };
        }
        return acc;
      },
      { query: "", reads: 0 }
    );
    this.removeQuery(JSON.parse(leastRead.query));
  }

  removeQueriesToSize(
    size: number,
    method: "age" | "popularity" = "popularity"
  ): void {
    while (this.currentQueryCacheSize > size) {
      method === "popularity"
        ? this.removeLeastReadQuery()
        : this.removeOldestQuery();
    }
  }

  invalidateTable(tableId: string) {
    Object.entries(this.blocks).forEach(([cid, block]) => {
      if (block.table === tableId) this.removeBlock(cid);
    });
    Object.entries(this.queries).forEach(([query, queryData]) => {
      if (queryData.table === tableId) this.removeQueryById(query);
    });
  }

  clear(): void {
    this.blocks = {};
    this.queries = {};
    this.currentBlockCacheSize = 0;
    this.currentQueryCacheSize = 0;
  }

  serialize(): string {
    return base58btc.encode(
      json.encode({
        blocks: this.blocks,
        queries: this.queries,
        maxBlockCacheSize: this.maxBlockCacheSize,
        currentBlockCacheSize: this.currentBlockCacheSize,
        maxQueryCacheSize: this.maxQueryCacheSize,
        currentQueryCacheSize: this.currentQueryCacheSize,
      })
    );
  }

  static deserialize(serialized: string): DatabaseCache {
    const {
      blocks,
      queries,
      maxBlockCacheSize,
      currentBlockCacheSize,
      currentQueryCacheSize,
      maxQueryCacheSize,
    } = json.decode<DatabaseCacheState>(base58btc.decode(serialized));
    const cache = new DatabaseCache(maxBlockCacheSize, maxQueryCacheSize);
    cache.blocks = blocks;
    cache.queries = queries;
    cache.currentBlockCacheSize = currentBlockCacheSize;
    cache.currentQueryCacheSize = currentQueryCacheSize;
    return cache;
  }
}

export interface DatabaseCacheState {
  maxBlockCacheSize: number;
  currentBlockCacheSize: number;
  maxQueryCacheSize: number;
  currentQueryCacheSize: number;

  blocks: Record<
    string,
    {
      table: string;
      age: number;
      reads: number;
      block: BlockData;
    }
  >;

  queries: Record<
    string,
    {
      table: string;
      age: number;
      reads: number;
      result: QueryResult;
    }
  >;
}

export interface DatabaseCacheInterface extends DatabaseCacheState {
  hasBlock(cid: string): boolean;
  getBlock(cid: string): BlockData;
  cacheBlock(block: TableBlockInterface): void;
  removeBlock(cid: string): void;
  calculateBlockCacheSize(block: TableBlockInterface): number;
  removeOldestBlock(): void;
  removeLeastReadBlock(): void;
  removeBlocksToSize(size: number, method?: "age" | "popularity"): void;

  serializeQuery(query: TableQueryInterface): string;
  hasQuery(query: TableQueryInterface): boolean;
  getQuery(query: TableQueryInterface): QueryResult;
  cacheQuery(query: TableQueryInterface, result: QueryResult): void;
  removeQuery(query: TableQueryInterface): void;
  calculateQueryCacheSize(result: QueryResult): number;
  removeOldestQuery(): void;
  removeLeastReadQuery(): void;
  removeQueriesToSize(size: number, method?: "age" | "popularity"): void;

  invalidateTable(tableId: string): void;

  serialize(): string;

  clear(): void;
}

export const cache = new DatabaseCache(1000000, 1000000);
