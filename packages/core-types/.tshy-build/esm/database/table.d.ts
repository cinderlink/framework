export type SchemaObject = Record<string, unknown>;
import type { CID } from "multiformats";
import type Emittery from "emittery";
import MiniSearch, { Options as SearchOptions } from "minisearch";
import type { DIDDagInterface } from "../dag";
import { QueryBuilderInterface, TableQueryInterface } from "./query";
import { BlockData, BlockFilters, BlockHeaders, BlockIndexDef, BlockIndex, BlockAggregates, BlockAggregator } from "./block";
import { SubLoggerInterface } from "../logger";
export interface TableRow {
    id: number;
    uid: string;
    createdAt?: number;
    updatedAt?: number;
    [key: string]: unknown;
}
export interface TableBlockInterface<Row extends TableRow = TableRow, Def extends TableDefinition<Row> = TableDefinition<Row>> {
    table: TableInterface<Row, Def>;
    cid: CID | undefined;
    cache?: Partial<BlockData<Row>>;
    changed: boolean;
    needsRollup: boolean;
    index?: MiniSearch;
    buildSearchIndex(): void;
    prevCID(): Promise<string | undefined>;
    getCID(): Promise<CID | undefined>;
    headers(): Promise<BlockHeaders>;
    filters(): Promise<BlockFilters<Row, Def>>;
    records(): Promise<Record<number, Row>>;
    search(query: string, limit: number): Promise<Row[]>;
    save(): Promise<CID | undefined>;
    load(force?: boolean): Promise<void>;
    aggregate(): Promise<BlockAggregates<Row>>;
    violatesUniqueConstraints(row: Partial<Row>): Promise<boolean>;
    assertUniqueConstraints(row: Partial<Row>): Promise<void>;
    addRecord(row: Row): Promise<void>;
    updateRecord(id: number, update: Partial<Row>): Promise<Row | undefined>;
    deleteRecord(id: number): Promise<void>;
    toJSON(): BlockData<Row>;
    serialize(): Promise<BlockData<Row> | undefined>;
    toString(): string;
}
export interface TableDefinition<Row extends TableRow = TableRow> {
    encrypted: boolean;
    schemaId: string;
    schemaVersion: number;
    schema?: SchemaObject;
    indexes: Record<string, BlockIndexDef<Row>>;
    aggregate: Partial<Record<keyof Row, BlockAggregator>>;
    searchOptions: SearchOptions;
    rollup: number;
}
export type TableEvents<Row extends TableRow = TableRow, Def extends TableDefinition<Row> = TableDefinition<Row>> = {
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
export interface TableInterface<Row extends TableRow = TableRow, Def extends TableDefinition<Row> = TableDefinition<Row>> extends Emittery<TableEvents<Row, Def>> {
    tableId: string;
    currentIndex: number;
    currentBlock: TableBlockInterface<Row, Def>;
    encrypted: boolean;
    def: Def;
    dag: DIDDagInterface;
    writing: boolean;
    writeStartAt: number;
    logger: SubLoggerInterface;
    createBlock(prevCID: string | undefined): TableBlockInterface<Row, Def>;
    setBlock(block: TableBlockInterface<Row, Def>): void;
    insert(data: Omit<Omit<Row, "id">, "uid">): Promise<string>;
    computeUid(data: Omit<Omit<Row, "id">, "uid">): Promise<string>;
    bulkInsert(data: Omit<Omit<Row, "id">, "uid">[]): Promise<{
        saved: string[];
        errors: Record<number, string>;
    }>;
    update(uid: string, data: Partial<Row>): Promise<Row>;
    upsert<Index extends keyof Row = keyof Row>(check: Record<Index, Row[Index]>, data: Partial<Row>): Promise<Row>;
    search(query: string, limit: number): Promise<Row[]>;
    save(): Promise<CID | undefined>;
    query<Params extends unknown[] = unknown[]>(fn?: (qb: QueryBuilderInterface<Row>, ...params: Params) => QueryBuilderInterface<Row> | undefined, ...params: Params): TableQueryInterface<Row, Def>;
    load(cid: CID): Promise<void>;
    search(query: string, limit: number): Promise<Row[]>;
    unwind(next: (event: TableUnwindEvent<Row, Def>) => Promise<void> | void): Promise<void>;
    getById(id: number): Promise<Row | undefined>;
    getByUid(uid: string): Promise<Row | undefined>;
    getAllById(ids: number[]): Promise<Row[]>;
    assertValid(data: Partial<Row>): void;
    isValid(data: Partial<Row>): boolean;
    lock(): void;
    unlock(): void;
    awaitLock(): Promise<void>;
    awaitUnlock(): Promise<void>;
    serialize(): Promise<BlockData<Row> | undefined>;
    deserialize(cache: BlockData<Row, Def>): Promise<void>;
    hasChanges(): boolean;
}
export type TableUnwindEvent<Row extends TableRow = TableRow, Def extends TableDefinition<Row> = TableDefinition<Row>> = {
    cid: string | undefined;
    block: TableBlockInterface<Row, Def>;
    resolved: boolean;
};
