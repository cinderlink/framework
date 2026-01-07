import { AsPlainObject } from "minisearch";
import { TableDefinition, TableRow } from "./table";
export interface BlockHeaders {
    schema: string;
    table: string;
    encrypted: boolean;
    index: number;
    recordsFrom: number;
    recordsTo: number;
}
export interface BlockFilters<Row extends TableRow = TableRow, Def extends TableDefinition<Row> = TableDefinition<Row>> {
    aggregates: BlockAggregates<Row>;
    indexes: BlockIndexes<Row, Def>;
    search?: AsPlainObject;
}
export interface BlockData<Row extends TableRow = TableRow, Def extends TableDefinition<Row> = TableDefinition<Row>> {
    prevCID?: string;
    headers: BlockHeaders;
    filters: BlockFilters<Row, Def>;
    records: Record<number, Row>;
}
export interface BlockIndex<Row extends TableRow = TableRow> {
    values: Row[keyof Row][];
    ids: number[];
}
export interface BlockIndexDef<Row extends TableRow = TableRow> {
    unique?: boolean;
    fields: (keyof Row)[];
}
export type BlockAggregator = "sum" | "count" | "avg" | "min" | "max" | "distinct" | "range";
export type BlockAggregateDef<Row extends TableRow = TableRow> = Record<keyof Row, BlockAggregator>;
export interface BlockAggregateTypes {
    sum: number;
    count: number;
    avg: number;
    min: number;
    max: number;
    distinct: string[] | number[];
    range: [number, number];
}
export type BlockAggregates<Row extends TableRow = TableRow> = Record<keyof Row, BlockAggregateTypes[keyof BlockAggregateTypes]>;
export type BlockIndexes<Row extends TableRow = TableRow, Def extends TableDefinition<Row> = TableDefinition<Row>> = Record<keyof Def["indexes"], Record<string, BlockIndex<Row>>>;
