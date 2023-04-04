import type Emittery from "emittery";
import type { CID } from "multiformats";
import type { DIDDagInterface } from "../dag";
import type { TableDefinition, TableInterface, TableRow } from "./table";
import { JWE } from "did-jwt";
import { BlockData } from "./block";

export type SchemaDef = {
  schemaId: string;
  tables: Record<string, TableDefinition<any>>;
};

export type SchemaEvents = {
  "/schema/loaded": undefined;
};

export type SavedSchema = {
  schemaId: string;
  defs: Record<string, TableDefinition>;
  tables: Record<string, BlockData<any, any> | undefined>;
};

export interface SchemaInterface extends Emittery<SchemaEvents> {
  tables: Record<string, TableInterface<any>>;
  schemaId: string;
  defs: Record<string, TableDefinition<any>>;
  dag: DIDDagInterface;
  encrypted: boolean;

  createTable<Def extends TableDefinition<any> = TableDefinition<any>>(
    name: string,
    def: Def
  ): Promise<void>;
  dropTable(name: string): Promise<void>;

  getTable<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(
    name: string
  ): TableInterface<Row, Def>;

  setDefs<Def extends TableDefinition = TableDefinition>(
    defs: Record<string, Def>
  ): void;

  serialize(): Promise<SavedSchema | undefined>;
  export(): Promise<JWE | SavedSchema | undefined>;
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
