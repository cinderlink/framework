import Emittery from "emittery";
import type { DIDDagInterface, TableRow } from "@cinderlink/core-types";
import { CID } from "multiformats";
import type {
  SavedSchema,
  SchemaEvents,
  SchemaInterface,
} from "@cinderlink/core-types/src/database/schema";
import type {
  TableDefinition,
  TableInterface,
} from "@cinderlink/core-types/src/database/table";
import { Table } from "./table";

export class Schema extends Emittery<SchemaEvents> implements SchemaInterface {
  public tables: Record<string, TableInterface<any, any>> = {};
  constructor(
    public schemaId: string,
    public defs: Record<string, TableDefinition<any>>,
    public dag: DIDDagInterface,
    public encrypted = true
  ) {
    super();
    Object.entries(defs).forEach(([tableId, def]) => {
      // console.info(`Creating table "${tableId}"`);
      this.tables[tableId] = new Table(tableId, def, this.dag);
    });
  }

  setDefs(defs: Record<string, TableDefinition>) {
    Object.entries(defs).forEach(([tableId, def]) => {
      if (!this.tables[tableId]) {
        this.tables[tableId] = new Table(tableId, def, this.dag);
      } else {
        console.warn(
          `WARNING: table "${tableId}" already exists, migrations not yet supported`
        );
      }
    });
  }

  async createTable(tableId: string, def: TableDefinition<any>) {
    this.tables[tableId] = new Table(tableId, def, this.dag);
  }

  async dropTable(name: string) {
    delete this.tables[name];
  }

  getTable<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(tableId: string) {
    return this.tables[tableId] as TableInterface<Row, Def>;
  }

  async save() {
    const tables: Record<string, string | undefined> = {};
    try {
      await Promise.all(
        Object.entries(this.tables).map(async ([name]) => {
          // console.info(`ipld-database/schema/save: saving table ${name}`);
          const tableCID = await this.tables[name].save();
          if (tableCID) {
            tables[name] = tableCID?.toString();
          }
        })
      ).catch((err) => {
        console.info(`ipld-database/schema/save: table save error: ${err}`);
      });
    } catch (err) {
      console.info(`ipld-database/schema/save: table save error: ${err}`);
    }
    if (!Object.keys(tables).length) return undefined;

    const savedSchema = {
      schemaId: this.schemaId,
      defs: this.defs,
      tables,
    };

    // console.info(
    //   `ipld-database/schema/save: saving ${this.schemaId}`,
    //   savedSchema
    // );

    return this.encrypted
      ? this.dag.storeEncrypted(savedSchema)
      : this.dag.store(savedSchema);
  }

  static async load(cid: string | CID, dag: DIDDagInterface, encrypted = true) {
    const data = encrypted
      ? await dag.loadDecrypted<SavedSchema>(cid)
      : await dag.load<SavedSchema>(cid);
    if (!data) throw new Error("Invalid schema data");
    return Schema.fromSavedSchema(data, dag);
  }

  static async fromSavedSchema(
    data: SavedSchema,
    dag: DIDDagInterface,
    encrypted = true
  ): Promise<SchemaInterface> {
    if (!data) throw new Error("Invalid schema data");
    const schema = new Schema(data.schemaId, data.defs, dag, encrypted);
    // console.info(`Loading schema "${data.schemaId}"`, data);
    await Promise.all(
      Object.entries(data.tables).map(async ([name, tableCID]) => {
        if (tableCID) {
          // console.info(`Loading table "${name}" from ${tableCID}`);
          await schema.tables[name]?.load(CID.parse(tableCID));
        }
      })
    );
    schema.emit("/schema/loaded");
    return schema as SchemaInterface;
  }
}
