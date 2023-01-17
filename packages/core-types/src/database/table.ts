import type { SchemaObject } from "ajv";
import type { CID } from "multiformats";
import type Emittery from "emittery";
import type {
  default as Minisearch,
  AsPlainObject,
  Options as SearchOptions,
} from "minisearch";
import type { DIDDagInterface } from "../dag";

export type TableRow<Data extends Record<string, unknown> = {}> = {
  id?: number;
  [key: string]: unknown;
} & Data;

export type TableDefinition = {
  encrypted: boolean;
  schema: SchemaObject;
  indexes: string[];
  aggregate: {
    [key: string]:
      | "sum"
      | "count"
      | "avg"
      | "min"
      | "max"
      | "distinct"
      | "range";
  };
  searchOptions: SearchOptions;
  rollup: number;
};

export type TableBlock<T extends TableRow = TableRow> = {
  prevCID?: string;
  fromIndex: number;
  toIndex: number;
  records: Record<number, T>;
  indexes: Record<string, Record<string, number[]>>;
  aggregates: Record<string, number | string | string[] | [number, number]>;
  search?: Minisearch;
  index?: AsPlainObject;
};

export type TableEvents = {
  "/table/loaded": undefined;
};

export interface TableInterface<T extends TableRow = TableRow>
  extends Emittery<TableEvents> {
  currentIndex: number;
  currentBlock: TableBlock;
  encrypted: boolean;
  def: TableDefinition;
  dag: DIDDagInterface;

  createBlock(prevCID: string | undefined): TableBlock;
  insert(data: T): Promise<number>;
  search(query: string, limit: number): Promise<T[]>;
  rollup(): Promise<void>;
  updateBlockAggregates(block: TableBlock): void;
  save(): Promise<string | undefined>;
  update(id: number, data: Partial<T>): Promise<number>;
  load(cid: CID | string): Promise<void>;
  unwind(
    test: (block: TableBlock, cid: string | undefined) => Promise<boolean>
  ): Promise<void>;
  findByIndex(index: string, value: string): Promise<T | undefined>;
  where(match: (row: T) => boolean): Promise<T[]>;
  find(match: (row: T) => boolean): Promise<T | undefined>;
  upsert(index: string, value: string | number, data: T): Promise<number>;
  assertValid(data: T): void;
  isValid(data: T): boolean;
}
