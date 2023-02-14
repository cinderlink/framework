import Emittery from "emittery";
import type { DIDDagInterface } from "@candor/core-types";
import { CID } from "multiformats";
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
    public schemaId: string,
    public defs: Record<string, TableDefinition>,
    public dag: DIDDagInterface,
    public encrypted = true
  ) {
    super();
    Object.entries(defs).forEach(([tableId, def]) => {
      console.info(`Creating table "${tableId}"`);
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

  async createTable(tableId: string, def: TableDefinition) {
    this.tables[tableId] = new Table(tableId, def, this.dag);
  }

  async dropTable(name: string) {
    delete this.tables[name];
  }

  getTable<
    Row extends TableRow = TableRow,
    Def extends TableDefinition = TableDefinition
  >(tableId: string) {
    return this.tables[tableId] as TableInterface<Row, Def>;
  }

  async save() {
    const tables: Record<string, string | undefined> = {};
    try {
      await Promise.all(
        Object.entries(this.tables).map(async ([name]) => {
          const tableCID = await this.tables[name].save().catch((err) => {
            console.error(`Failed to save table "${name}"`, err);
          });
          if (tableCID) {
            console.info(`Saved table "${name}" to ${tableCID}`);
            tables[name] = tableCID?.toString();
          } else {
            console.info(
              `Table "${name}" failed to save (empty or invalid table)`
            );
          }
        })
      ).catch((err) => {
        console.error("Failed to save tables", err);
      });
    } catch (err) {
      console.error("Failed to save tables", err);
    }
    console.info(`Tables saved: ${JSON.stringify(tables)}`);
    const savedSchema = {
      schemaId: this.schemaId,
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
    if (!data) throw new Error("Invalid schema data");
    return Schema.fromSavedSchema(data, dag);
  }

  static async fromSavedSchema(
    data: SavedSchema,
    dag: DIDDagInterface,
    encrypted = true
  ) {
    if (!data) throw new Error("Invalid schema data");
    const schema = new Schema(data.schemaId, data.defs, dag, encrypted);
    console.info(`Loading schema "${data.schemaId}"`, data);
    await Promise.all(
      Object.entries(data.tables).map(async ([name, tableCID]) => {
        if (tableCID) {
          console.info(`Loading table "${name}" from ${tableCID}`);
          await schema.tables[name]?.load(CID.parse(tableCID));
        }
      })
    );
    schema.emit("/schema/loaded");
    return schema;
  }
}
