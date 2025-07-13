import { JWE } from "did-jwt";
import Emittery from "emittery";
import { BlockData, DIDDagInterface, SubLoggerInterface, TableRow, SavedSchema, SchemaEvents, SchemaInterface, TableDefinition, TableInterface } from "@cinderlink/core-types";
import { CID } from "multiformats";

import type { SchemaRegistryInterface } from "@cinderlink/schema-registry";
import { Table } from "./table.js";

export class Schema extends Emittery<SchemaEvents> implements SchemaInterface {
  public tables: Record<string, TableInterface<TableRow>> = {};
  constructor(
    public schemaId: string,
    public defs: Record<string, TableDefinition<TableRow>>,
    public dag: DIDDagInterface,
    public logger: SubLoggerInterface,
    public encrypted = true,
    public schemaRegistry?: SchemaRegistryInterface
  ) {
    super();
    this.logger.info(`creating schema "${schemaId}"`);
    Object.entries(defs).forEach(([tableId, def]) => {
      this.logger.info(`creating table "${tableId}"`);
      this.tables[tableId] = new Table(
        tableId,
        def,
        this.dag,
        this.logger.submodule(`table:${tableId}`),
        this.schemaRegistry
      );
    });
  }

  setDefs(defs: Record<string, TableDefinition<TableRow>>) {
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

  createTable(tableId: string, def: TableDefinition<TableRow>) {
    if (this.tables[tableId]) {
      throw new Error(`table already exists: ${tableId}`);
    }
    this.tables[tableId] = new Table(
      tableId,
      def,
      this.dag,
      this.logger.submodule(`table:${tableId}`)
    );
  }

  dropTable(name: string) {
    delete this.tables[name];
  }

  hasChanges() {
    return Object.values(this.tables).some((table) => table.hasChanges());
  }

  getTable<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(tableId: string): TableInterface<Row, Def> {
    // Use unknown as intermediate type for safe casting
    const table = this.tables[tableId];
    if (!table) {
      throw new Error(`Table ${tableId} not found`);
    }
    return table as unknown as TableInterface<Row, Def>;
  }

  serialize() {
    const tables: Record<string, BlockData<TableRow> | undefined> = {};
    try {
      await Promise.all(
        Object.entries(this.tables).map(([name]) => {
          this.logger.debug(`serializing table ${name}`);
          const table = await this.tables[name].serialize();
          if (table) {
            tables[name] = table;
          }
        })
      ).catch((error) => {
        this.logger.error(`table serialize error`, { error });
      });
    } catch (_error) {
      this.logger.error(`schema serialize error`, { error });
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
    logger: SubLoggerInterface,
    schemaRegistry?: SchemaRegistryInterface
  ) {
    const data = await dag.load<SavedSchema>(cid).catch(() => undefined);
    if (!data) {
      logger.error(`failed to load schema ${cid}`);
      throw new Error("Failed to load schema");
    }
    return Schema.fromSavedSchema(data, dag, logger, true, schemaRegistry);
  }

  static fromSavedSchema(
    data: SavedSchema,
    dag: DIDDagInterface,
    logger: SubLoggerInterface,
    encrypted = true,
    schemaRegistry?: SchemaRegistryInterface
  ): Promise<SchemaInterface> {
    if (!data) {
      throw new Error("Invalid schema data");
    }
    const schema = new Schema(data.schemaId, data.defs, dag, logger, encrypted, schemaRegistry);
    logger.debug(`hydrating schema "${data.schemaId}"`);
    await Promise.all(
      Object.entries(data.tables).map(([name, tableData]) => {
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
