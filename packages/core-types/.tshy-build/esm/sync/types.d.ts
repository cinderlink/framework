import { CinderlinkClientInterface } from "../client";
import { QueryBuilderInterface, TableInterface, TableRow } from "../database";
import { Peer } from "../p2p";
import { PluginEventDef } from "../plugin";
export interface SyncTablesRow extends TableRow {
    schemaId: string;
    tableId: string;
    did: string;
    lastSyncedAt: number;
    lastFetchedAt: number;
}
export interface SyncRowsRow extends TableRow {
    schemaId: string;
    tableId: string;
    rowUid: string;
    did: string;
    success?: boolean;
    error?: string;
    attempts?: number;
    lastSyncedAt: number;
    lastFetchedAt: number;
}
export interface SyncConfig<Row extends TableRow> {
    syncOnChange?: boolean;
    query: (table: TableInterface<Row>, params: Record<string, any>, client: CinderlinkClientInterface<any>) => QueryBuilderInterface<Row>;
    fetchInterval?: number;
    fetchFrom?: (peers: Peer[], table: TableInterface<Row>, client: CinderlinkClientInterface<any>) => Promise<string | string[] | boolean>;
    syncInterval?: number;
    syncTo?: (peers: Peer[], table: TableInterface<Row>, client: CinderlinkClientInterface<any>) => Promise<string | string[] | boolean>;
    syncRowTo?: (row: Row, peers: Peer[], table: TableInterface<Row>, client: CinderlinkClientInterface<any>) => Promise<string | string[] | boolean>;
    allowFetchFrom?: (did: string, table: TableInterface<Row>, client: CinderlinkClientInterface<any>) => Promise<boolean>;
    allowFetchRowFrom?: (row: Row, did: string, table: TableInterface<Row>, client: CinderlinkClientInterface<any>) => Promise<boolean>;
    allowNewFrom?: (did: string, table: TableInterface<Row>, client: CinderlinkClientInterface<any>) => Promise<boolean>;
    allowUpdateFrom?: (row: Row, did: string, table: TableInterface<Row>, client: CinderlinkClientInterface<any>) => Promise<boolean>;
    incomingRateLimit?: number;
    outgoingRateLimit?: number;
}
export interface SyncSaveRequest {
    requestId: string;
    schemaId: string;
    tableId: string;
    rows: TableRow[];
}
export interface SyncSaveResponse {
    requestId: string;
    schemaId: string;
    tableId: string;
    saved?: string[];
    errors?: Record<number, string>;
}
export interface SyncFetchRequest {
    requestId: string;
    schemaId: string;
    tableId: string;
    since: number;
}
export interface SyncFetchResponse {
    requestId: string;
    schemaId: string;
    tableId: string;
    rows: TableRow[];
}
export interface SyncSinceRequest {
    since: number;
}
export interface SyncPluginEvents extends PluginEventDef {
    send: {
        "/cinderlink/sync/save/request": SyncSaveRequest;
        "/cinderlink/sync/save/response": SyncSaveResponse;
        "/cinderlink/sync/fetch/request": SyncFetchRequest;
        "/cinderlink/sync/fetch/response": SyncFetchResponse;
        "/cinderlink/sync/since": SyncSinceRequest;
    };
    receive: {
        "/cinderlink/sync/save/request": SyncSaveRequest;
        "/cinderlink/sync/save/response": SyncSaveResponse;
        "/cinderlink/sync/fetch/request": SyncFetchRequest;
        "/cinderlink/sync/fetch/response": SyncFetchResponse;
        "/cinderlink/sync/since": SyncSinceRequest;
    };
    publish: {
        "/cinderlink/sync/save/request": SyncSaveRequest;
        "/cinderlink/sync/save/response": SyncSaveResponse;
        "/cinderlink/sync/fetch/request": SyncFetchRequest;
        "/cinderlink/sync/fetch/response": SyncFetchResponse;
    };
    subscribe: {
        "/cinderlink/sync/save/request": SyncSaveRequest;
        "/cinderlink/sync/save/response": SyncSaveResponse;
        "/cinderlink/sync/fetch/request": SyncFetchRequest;
        "/cinderlink/sync/fetch/response": SyncFetchResponse;
    };
    emit: {};
}
export interface SyncPluginOptions {
    syncing: Record<string, SyncConfig<any>>;
}
//# sourceMappingURL=types.d.ts.map