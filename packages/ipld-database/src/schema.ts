import Emittery from "emittery";
import type { DIDDagInterface } from "@candor/core-types";
import type { CID } from "multiformats";
import type {
  SavedSchema,
  SchemaEvents,
  SchemaInterface,
} from "@candor/core-types/src/database/schema";
import type {
  TableDefinition,
  TableInterface,
  TableRow,
} from "@candor/core-types/src/database/table";
import { Table } from "./table";

export class Schema extends Emittery<SchemaEvents> implements SchemaInterface {
  public tables: Record<string, TableInterface> = {};
  constructor(
    public name: string,
    public defs: Record<string, TableDefinition>,
    public dag: DIDDagInterface,
    public encrypted = true
  ) {
    super();
    console.info("creating schema", { name, defs, encrypted });
    Object.entries(defs).forEach(([name, def]) => {
      this.tables[name] = new Table(def, this.dag);
    });
  }

  setDefs(defs: Record<string, TableDefinition>) {
    Object.entries(defs).forEach(([name, def]) => {
      if (!this.tables[name]) {
        this.tables[name] = new Table(def, this.dag);
      } else {
        console.warn(
          `WARNING: table "${name}" already exists, migrations not yet supported`
        );
      }
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
