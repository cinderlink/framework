import { JWE } from "did-jwt";
import Emittery from "emittery";
import type {
  BlockData,
  DIDDagInterface,
  SubLoggerInterface,
  TableRow,
} from "@cinderlink/core-types";
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
    public logger: SubLoggerInterface,
    public encrypted = true
  ) {
    super();
    Object.entries(defs).forEach(([tableId, def]) => {
      this.logger.info(`creating table "${tableId}"`);
      this.tables[tableId] = new Table(
        tableId,
        def,
        this.dag,
        this.logger.submodule(`table:${tableId}`)
      );
    });
  }

  setDefs(defs: Record<string, TableDefinition>) {
    this.defs = defs;
    Object.entries(defs).forEach(([tableId, def]) => {
      if (!this.tables[tableId]) {
        this.tables[tableId] = new Table(
          tableId,
          def,
          this.dag,
          this.logger.submodule(`table:${tableId}`)
        );
      } else {
        this.logger.warn(
          `table "${tableId}" already exists, migrations not yet supported`
        );
      }
    });
  }

  async createTable(tableId: string, def: TableDefinition<any>) {
    this.tables[tableId] = new Table(
      tableId,
      def,
      this.dag,
      this.logger.submodule(`table:${tableId}`)
    );
  }

  async dropTable(name: string) {
    delete this.tables[name];
  }

  hasChanges() {
    return Object.values(this.tables).some((table) => table.hasChanges());
  }

  getTable<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(tableId: string) {
    return this.tables[tableId] as TableInterface<Row, Def>;
  }

  async serialize() {
    const tables: Record<string, BlockData<any> | undefined> = {};
    try {
      await Promise.all(
        Object.entries(this.tables).map(async ([name]) => {
          this.logger.debug(`serializing table ${name}`);
          const table = await this.tables[name].serialize();
          if (table) {
            tables[name] = table;
          }
        })
      ).catch((error) => {
        this.logger.error(`table "${name}" serialize error`, { error });
      });
    } catch (error) {
      this.logger.error(`table "${name}" serialize error`, { error });
    }
    if (!Object.keys(tables).length) return undefined;

    const asJson: SavedSchema = {
      schemaId: this.schemaId,
      defs: this.defs,
      tables,
    };

    return asJson;
  }

  async export(): Promise<JWE | SavedSchema | undefined> {
    const serialized = await this.serialize();
    if (!serialized) {
      return undefined;
    }
    return serialized;
  }

  async save() {
    const serialized = await this.serialize();
    if (!serialized) {
      throw new Error("failed to serialize schema: " + this.schemaId);
    }
    this.logger.debug("saving schema", serialized);
    return this.dag.store(serialized);
  }

  static async load(
    cid: string | CID,
    dag: DIDDagInterface,
    logger: SubLoggerInterface
  ) {
    const data = await dag.load<SavedSchema>(cid).catch(() => undefined);
    if (!data) {
      logger.error(`failed to load schema ${cid}`);
      throw new Error("Failed to load schema");
    }
    return Schema.fromSavedSchema(data, dag, logger);
  }

  static async fromSavedSchema(
    data: SavedSchema,
    dag: DIDDagInterface,
    logger: SubLoggerInterface,
    encrypted = true
  ): Promise<SchemaInterface> {
    if (!data) {
      throw new Error("Invalid schema data");
    }
    const schema = new Schema(data.schemaId, data.defs, dag, logger, encrypted);
    logger.debug(`hydrating schema "${data.schemaId}"`);
    await Promise.all(
      Object.entries(data.tables).map(async ([name, tableData]) => {
        logger.debug(`hydrating table "${name}"`);
        if (tableData) {
          await schema.tables[name]?.deserialize(tableData);
        }
      })
    );
    schema.emit("/schema/loaded");
    return schema as SchemaInterface;
  }
}
