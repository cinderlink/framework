import { DIDDagInterface } from "@cryptids/dag-interface/dist";
import { CID } from "multiformats";
import { Table, TableDefinition } from "./table";

export type SavedSchema = {
  name: string;
  defs: Record<string, TableDefinition>;
  tables: Record<string, string | undefined>;
};

export class Schema {
  public tables: Record<string, Table> = {};
  constructor(
    public name: string,
    public defs: Record<string, TableDefinition>,
    public dag: DIDDagInterface
  ) {
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

  getTable(name: string) {
    return this.tables[name];
  }

  async save() {
    const tables: Record<string, string | undefined> = {};
    await Promise.all(
      Object.entries(this.tables).map(async ([name]) => {
        tables[name] = (await this.tables[name].save())?.toString();
      })
    );
    return this.dag.store({
      name: this.name,
      defs: this.defs,
      tables,
    });
  }

  static async load(cid: string | CID, dag: DIDDagInterface) {
    const data = await dag.load<SavedSchema>(cid);
    const schema = new Schema(data.name, data.defs, dag);
    await Promise.all(
      Object.entries(data.tables).map(async ([name, tableCID]) => {
        await schema.tables[name].load(tableCID!);
      })
    );
    return schema;
  }
}
