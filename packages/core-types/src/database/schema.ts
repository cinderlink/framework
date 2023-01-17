import type Emittery from "emittery";
import type { CID } from "multiformats";
import type { DIDDagInterface } from "../../dist";
import type { TableDefinition, TableInterface, TableRow } from "./table";

export type SchemaEvents = {
  "/schema/loaded": undefined;
};

export type SavedSchema = {
  name: string;
  defs: Record<string, TableDefinition>;
  tables: Record<string, string | undefined>;
};

export interface SchemaInterface extends Emittery<SchemaEvents> {
  tables: Record<string, TableInterface>;
  name: string;
  defs: Record<string, TableDefinition>;
  dag: DIDDagInterface;
  encrypted: boolean;

  createTable(name: string, def: TableDefinition): Promise<void>;
  dropTable(name: string): Promise<void>;
  getTable<T extends TableRow = TableRow>(name: string): TableInterface<T>;
  save(): Promise<CID | undefined>;
}

export interface SchemaClass {
  new (): SchemaInterface;
  load(
    cid: string | CID,
    dag: DIDDagInterface,
    encrypted: boolean
  ): Promise<SchemaInterface>;
  fromSavedSchema(
    data: SavedSchema,
    dag: DIDDagInterface,
    encrypted: boolean
  ): Promise<SchemaInterface>;
}
