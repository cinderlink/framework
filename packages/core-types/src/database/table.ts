import type { SchemaObject } from "ajv";
import type { CID } from "multiformats";
import type Emittery from "emittery";
import type { Options as SearchOptions } from "minisearch";
import type { DIDDagInterface } from "../dag";
import { TableQueryInterface } from "./query";
import {
  BlockData,
  BlockFilters,
  BlockHeaders,
  BlockIndexDef,
  BlockIndex,
  BlockAggregates,
  BlockAggregator,
} from "./block";

export type TableRow<Data extends Record<string, unknown> = {}> = {
  id: number;
  [key: string]: unknown;
} & Data;

export interface TableBlockInterface<
  Row extends TableRow = TableRow,
  Def extends TableDefinition = TableDefinition
> {
  table: TableInterface<Row, Def>;
  cid: CID | undefined;
  cache?: Partial<BlockData<Row>>;
  changed: boolean;
  needsRollup: boolean;
  prevCID(): Promise<string | undefined>;
  getCID(): Promise<CID | undefined>;
  headers(): Promise<BlockHeaders>;
  filters(): Promise<BlockFilters>;
  records(): Promise<Record<number, Row>>;
  search(query: string, limit: number): Promise<Row[]>;
  save(): Promise<CID | undefined>;
  load(force?: boolean): Promise<void>;
  aggregate(): Promise<BlockAggregates>;
  violatesUniqueConstraints(row: Omit<Row, "id">): Promise<boolean>;
  assertUniqueConstraints(row: Omit<Row, "id">): Promise<void>;
  addRecord(row: Row): Promise<void>;
  updateRecord(id: number, update: Partial<Row>): Promise<void>;
  deleteRecord(id: number): Promise<void>;
  toJSON(): BlockData<Row>;
  toString(): string;
}

export type TableDefinition = {
  encrypted: boolean;
  schemaId: string;
  schema: SchemaObject;
  indexes: Record<string, BlockIndexDef>;
  aggregate: Record<string, BlockAggregator>;
  searchOptions: SearchOptions;
  rollup: number;
};

export type TableEvents<
  Row extends TableRow = TableRow,
  Def extends TableDefinition = TableDefinition
> = {
  "/table/loaded": TableInterface<Row, Def>;
  "/table/saved": TableInterface<Row, Def>;
  "/block/loaded": TableBlockInterface<Row, Def>;
  "/block/saved": TableBlockInterface<Row, Def>;
  "/record/inserted": Row;
  "/record/updated": Row;
  "/record/deleted": Row;
  "/index/inserted": BlockIndex;
  "/index/updated": BlockIndex;
  "/index/deleted": BlockIndex;
  "/aggregate/updated": {
    field: string;
    value: BlockAggregates[keyof BlockAggregates];
  };
  "/search/updated": undefined;
  "/write/started": undefined;
  "/write/finished": number;
};

export interface TableInterface<
  Row extends TableRow = TableRow,
  Def extends TableDefinition = TableDefinition
> extends Emittery<TableEvents> {
  tableId: string;
  currentIndex: number;
  currentBlock: TableBlockInterface<Row, Def>;
  encrypted: boolean;
  def: TableDefinition;
  dag: DIDDagInterface;
  writing: boolean;
  writeStartAt: number;

  createBlock(prevCID: string | undefined): TableBlockInterface<Row, Def>;
  setBlock(block: TableBlockInterface<Row, Def>): void;
  insert(data: Omit<Row, "id">): Promise<number>;
  update(id: number, data: Partial<Row>): Promise<Row>;
  upsert<Index extends keyof Row = keyof Row>(
    index: Index,
    value: Row[Index],
    data: Omit<Row, "id">
  ): Promise<Row>;
  search(query: string, limit: number): Promise<Row[]>;
  save(): Promise<CID | undefined>;
  query(): TableQueryInterface<Row, Def>;
  load(cid: CID): Promise<void>;
  search(query: string, limit: number): Promise<Row[]>;
  unwind(
    next: (event: TableUnwindEvent) => Promise<void> | void
  ): Promise<void>;
  assertValid(data: Omit<Row, "id">): void;
  isValid(data: Omit<Row, "id">): boolean;
  lock(): void;
  unlock(): void;
  awaitLock(): Promise<void>;
  awaitUnlock(): Promise<void>;
}

export type TableUnwindEvent<
  Row extends TableRow = TableRow,
  Def extends TableDefinition = TableDefinition
> = {
  cid: string | undefined;
  block: TableBlockInterface<Row, Def>;
  resolved: boolean;
};
