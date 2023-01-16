import { DIDDagInterface } from "@candor/core-types";
import Emittery from "emittery";
import type { CID } from "multiformats";
import { Table, TableDefinition, TableRow } from "./table";

export type SavedSchema = {
  name: string;
  defs: Record<string, TableDefinition>;
  tables: Record<string, string | undefined>;
};

export type SchemaEvents = {
  "/schema/loaded": undefined;
};

export class Schema extends Emittery<SchemaEvents> {
  public tables: Record<string, Table> = {};
  constructor(
    public name: string,
    public defs: Record<string, TableDefinition>,
    public dag: DIDDagInterface,
    public encrypted = true
  ) {
    super();
    Object.entries(defs).forEach(([name, def]) => {
      this.tables[name] = new Table(def, this.dag);
    });
  }

  async createTable(name: string, def: TableDefinition) {
    this.tables[name] = new Table(def, this.dag);
  }

  async dropTable(name: string) {
    delete this.tables[name];
  }

  getTable<T extends TableRow = TableRow>(name: string) {
    return this.tables[name] as Table<T>;
  }

  async save() {
    console.info("saving schema", this.name);
    const tables: Record<string, string | undefined> = {};
    await Promise.all(
      Object.entries(this.tables).map(async ([name]) => {
        const tableCID = await this.tables[name].save();
        if (tableCID) {
          tables[name] = tableCID?.toString();
        }
      })
    );
    console.info("storing schema", this.name, this.defs, tables);
    const savedSchema = {
      name: this.name,
      defs: this.defs,
      tables,
    };
    return this.encrypted
      ? this.dag.storeEncrypted(savedSchema)
      : this.dag.store(savedSchema);
  }

  static async load(cid: string | CID, dag: DIDDagInterface, encrypted = true) {
    const data = encrypted
      ? await dag.loadDecrypted<SavedSchema>(cid)
      : await dag.load<SavedSchema>(cid);
    return Schema.fromSavedSchema(data, dag);
  }

  static async fromSavedSchema(
    data: SavedSchema,
    dag: DIDDagInterface,
    encrypted = true
  ) {
    if (!data) throw new Error("Invalid schema data");
    console.info("loading from saved schema", data);
    const schema = new Schema(data.name, data.defs, dag, encrypted);
    await Promise.all(
      Object.entries(data.tables).map(async ([name, tableCID]) => {
        console.info("loading table", { name, tableCID });
        await schema.tables[name]?.load(tableCID!);
      })
    );
    schema.emit("/schema/loaded");
    return schema;
  }
}
