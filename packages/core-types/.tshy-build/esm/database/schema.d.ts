import type Emittery from "emittery";
import type { CID } from "multiformats";
import type { DIDDagInterface } from "../dag";
import type { TableDefinition, TableInterface, TableRow } from "./table";
import { JWE } from "did-jwt";
import { BlockData } from "./block";
import { SubLoggerInterface } from "../logger";
export type SchemaDef = {
    schemaId: string;
    tables: Record<string, TableDefinition<TableRow>>;
};
export type SchemaEvents = {
    "/schema/loaded": undefined;
};
export type SavedSchema = {
    schemaId: string;
    defs: Record<string, TableDefinition>;
    tables: Record<string, BlockData<TableRow> | undefined>;
};
export interface SchemaInterface extends Emittery<SchemaEvents> {
    tables: Record<string, TableInterface<TableRow>>;
    schemaId: string;
    defs: Record<string, TableDefinition<TableRow>>;
    dag: DIDDagInterface;
    encrypted: boolean;
    logger: SubLoggerInterface;
    createTable<Def extends TableDefinition<TableRow> = TableDefinition<TableRow>>(name: string, def: Def): Promise<void>;
    dropTable(name: string): Promise<void>;
    getTable<Row extends TableRow = TableRow, Def extends TableDefinition<Row> = TableDefinition<Row>>(name: string): TableInterface<Row, Def>;
    setDefs(defs: Record<string, TableDefinition<TableRow>>): void;
    serialize(): Promise<SavedSchema | undefined>;
    export(): Promise<JWE | SavedSchema | undefined>;
    save(): Promise<CID | undefined>;
    hasChanges(): boolean;
}
export interface SchemaClass {
    new (): SchemaInterface;
    load(cid: string | CID, dag: DIDDagInterface, logger: SubLoggerInterface, encrypted: boolean): Promise<SchemaInterface>;
    fromSavedSchema(data: SavedSchema, dag: DIDDagInterface, logger: SubLoggerInterface, encrypted: boolean): Promise<SchemaInterface>;
}
