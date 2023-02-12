import { AsPlainObject } from "minisearch";

export type BlockHeaders = {
  schema: string;
  table: string;
  encrypted: boolean;
  index: number;
  recordsFrom: number;
  recordsTo: number;
};

export type BlockFilters = {
  aggregates: BlockAggregates;
  indexes: BlockIndexes;
  search?: AsPlainObject;
};

export interface BlockData<
  Row extends Record<string, any> = Record<string, any>
> {
  prevCID?: string;
  headers: BlockHeaders;
  filters: BlockFilters;
  records: Record<number, Row>;
}

export type BlockIndex = {
  values: (string | undefined)[];
  ids: number[];
};

export type BlockIndexDef = {
  unique?: boolean;
  fields: string[];
};

export type BlockAggregator =
  | "sum"
  | "count"
  | "avg"
  | "min"
  | "max"
  | "distinct"
  | "range";

export type BlockAggregateDef = Record<string, BlockAggregator>;

export type BlockAggregateTypes = {
  sum: number;
  count: number;
  avg: number;
  min: number;
  max: number;
  distinct: string[] | number[];
  range: [number, number];
};

export type BlockAggregates = Record<
  string,
  BlockAggregateTypes[keyof BlockAggregateTypes]
>;

export type BlockIndexes = Record<string, Record<string, BlockIndex>>;
