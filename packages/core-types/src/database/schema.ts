import type Emittery from "emittery";
import type { CID } from "multiformats";
import type { DIDDagInterface } from "../dag";
import type { TableDefinition, TableInterface, TableRow } from "./table";

export type SchemaEvents = {
  "/schema/loaded": undefined;
};

export type SavedSchema = {
  schemaId: string;
  defs: Record<string, TableDefinition>;
  tables: Record<string, string | undefined>;
};

export interface SchemaInterface extends Emittery<SchemaEvents> {
  tables: Record<string, TableInterface>;
  schemaId: string;
  defs: Record<string, TableDefinition>;
  dag: DIDDagInterface;
  encrypted: boolean;

  createTable(name: string, def: TableDefinition): Promise<void>;
  dropTable(name: string): Promise<void>;
  getTable<
    Row extends TableRow = TableRow,
    Def extends TableDefinition = TableDefinition
  >(
    name: string
  ): TableInterface<Row, Def>;
  setDefs(defs: Record<string, TableDefinition>): void;
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
