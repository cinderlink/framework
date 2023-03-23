import { CinderlinkClientInterface } from "../client";
import { QueryBuilderInterface, TableRow } from "../database";
import { Peer } from "../p2p";
import { PluginEventDef } from "../plugin";

export interface SyncTableRules {
  confirmations: number;
  frequency: number;
  chunkSize: number;
  query?: (qb: QueryBuilderInterface, peer: Peer) => QueryBuilderInterface;
  allowIncoming?: (
    row: TableRow,
    peer: Peer,
    client: CinderlinkClientInterface<any>
  ) => Promise<boolean>;
}

export interface SyncTableRow extends TableRow {
  schemaId: string;
  tableId: string;
  rowId: number;
  did: string;
  attempts: number;
  last_attempt: number;
  success: boolean;
}

export interface SyncTableRequest {
  requestId: string;
  schemaId: string;
  tableId: string;
  rows: TableRow[];
}

export interface SyncTableResponse {
  requestId: string;
  schemaId: string;
  tableId: string;
  saved: number[];
  errors: Record<number, string>;
}

export interface SyncPluginEvents extends PluginEventDef {
  send: {
    "/cinderlink/sync/table/request": SyncTableRequest;
    "/cinderlink/sync/table/response": SyncTableResponse;
  };
  receive: {
    "/cinderlink/sync/table/request": SyncTableRequest;
    "/cinderlink/sync/table/response": SyncTableResponse;
  };
  publish: {};
  subscribe: {};
  emit: {};
}

export type SyncSchemaOptions = Record<string, Record<string, SyncTableRules>>;
export interface SyncPluginOptions {
  schemas: SyncSchemaOptions;
}
