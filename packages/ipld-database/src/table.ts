import type { DIDDagInterface, TableBlockInterface } from "@candor/core-types";
import { CID } from "multiformats";
import Emittery from "emittery";
import Ajv from "ajv";

import {
  TableDefinition,
  TableEvents,
  TableInterface,
  TableRow,
  TableUnwindEvent,
} from "@candor/core-types/src/database/table";
import { TableBlock } from "./block";
import { TableQuery } from "./query";
import { cache } from "./cache";

const ajv = new Ajv();

export class Table<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >
  extends Emittery<TableEvents<Row, Def>>
  implements TableInterface<Row, Def>
{
  currentIndex: number = 0;
  currentBlock: TableBlockInterface<Row, Def>;
  currentBlockIndex: number = 0;
  encrypted: boolean;
  writing = false;
  writeStartAt = 0;

  constructor(
    public tableId: string,
    public def: Def,
    public dag: DIDDagInterface
  ) {
    super();
    this.encrypted = def.encrypted;
    this.currentBlock = this.createBlock(undefined);
  }

  createBlock(prevCID: string | undefined): TableBlockInterface<Row, Def> {
    return new TableBlock<Row, Def>(this, undefined, {
      prevCID,
      headers: {
        table: this.tableId,
        schema: this.def.schemaId,
        recordsFrom: this.currentIndex,
        recordsTo: this.currentIndex,
        encrypted: this.encrypted,
        index: this.currentBlockIndex,
      },
    });
  }

  setBlock(block: TableBlockInterface<Row, Def>) {
    this.currentBlock = block;
    this.currentBlockIndex = Number(block.cache!.headers!.index) || 0;
    this.currentIndex = Number(block.cache!.headers!.recordsTo) || 0;
    this.emit("/block/saved", block);
  }

  async insert(data: Omit<Row, "id">) {
    this.assertValid(data as Partial<Row>);
    await this.assertUniqueConstraint(data as Row);
    await this.awaitLock();
    const id = ++this.currentIndex;
    console.info(`table/${this.tableId} > inserting record ${id}`, data);
    await this.currentBlock.addRecord({ ...data, id } as Row);
    cache.invalidateTable(this.tableId);
    if (
      Object.values(this.currentBlock.cache?.records || {}).length >=
      this.def.rollup
    ) {
      const cid = await this.currentBlock.save();
      if (cid) {
        this.currentBlock = this.createBlock(cid.toString());
      }
    }
    this.unlock();
    this.emit("/record/inserted", { ...data, id } as Row);
    console.info(`table/${this.tableId} > inserted record ${id}`, data);
    return id;
  }

  async bulkInsert(data: Row[]) {
    await this.awaitLock();
    const saved: number[] = [];
    const errors: Record<number, string> = {};
    for (const index in data) {
      const row = data[index];
      await this.insert(row)
        .then((id) => {
          saved.push(id);
        })
        .catch((err) => {
          const identifier = row.id || index;
          errors[identifier as number] = err;
        });
    }
    this.unlock();
    return { saved, errors };
  }

  async upsert<Index extends keyof Row = keyof Row>(
    check: Record<Index, Row[Index]>,
    data: Partial<Row>
  ) {
    this.assertValid(data);
    const existing = check["id" as Index]
      ? await this.getById(check["id" as Index] as number)
      : await this.query()
          .and((qb) => {
            for (const index in check) {
              qb.where(index, "=", check[index] as Row[Index]);
            }
          })
          .select()
          .nocache()
          .execute()
          .then((r) => r.first());

    if (existing?.id) {
      return this.update(existing.id, data as Row);
    } else if (data.id) {
      throw new Error(`Failed upsert with id ${data.id}, record not found`);
    }
    this.unlock();
    return this.insert({ ...check, ...data } as Omit<Row, "id">).then((id) =>
      this.getById(id)
    );
  }

  async update(id: number, update: Partial<Row>) {
    const updated = (
      await this.query()
        .where("id", "=", id)
        .update(update)
        .returning()
        .execute()
    ).first() as Row;
    this.emit("/record/updated", updated);
    return updated;
  }

  async getById(id: number) {
    await this.awaitUnlock();
    const results = await this.query()
      .where("id", "=", id)
      .select()
      .nocache()
      .execute();
    return results.first();
  }

  async getAllById(ids: number[]) {
    await this.awaitUnlock();
    const results = await this.query()
      .where("id", "in", ids)
      .select()
      .nocache()
      .execute()
      .then((r) => r.all());
    return results;
  }

  async search(query: string, limit = 10): Promise<Row[]> {
    let results: Row[] = [];
    await this.unwind(async (event) => {
      if (!event.block.index) {
        event.block.buildSearchIndex();
      }
      console.info(
        `block index loaded for ${event.block.cid}`,
        event.block.index
      );
      const searchResults = (await event.block.search(
        query,
        limit - results.length
      )) as Row[];
      results = results.concat(searchResults);
      event.resolved = results.length >= limit;
    });
    return results.slice(0, limit);
  }

  async save() {
    if (this.currentBlock.changed) {
      console.info(`table/${this.tableId} > saving`, this.currentBlock.cid);
      cache.invalidateTable(this.tableId);
      await this.currentBlock.save();
      console.info(`table/${this.tableId} > saved`, this.currentBlock.cid);
    }

    return this.currentBlock.cid;
  }

  async load(cid: CID) {
    const block = new TableBlock<Row, Def>(this, cid);
    await block.load();
    this.setBlock(block);
  }

  async unwind(
    next: (event: TableUnwindEvent<Row, Def>) => Promise<void> | void
  ) {
    const event: TableUnwindEvent<Row, Def> = {
      cid: undefined,
      block: this.currentBlock,
      resolved: false,
    };
    while (!event.resolved && event.block) {
      await Promise.resolve(next(event)).catch((e: Error) => {
        event.resolved = true;
        console.warn(`ipld-database/table/unwind: error in unwind callback`);
        console.warn(e);
        console.warn(e.stack);
      });

      const prevCID = await event.block?.prevCID();
      event.cid = !event.resolved ? prevCID : undefined;
      if (!event.cid) {
        event.resolved = true;
      } else {
        event.block = new TableBlock<Row, Def>(this, CID.parse(event.cid));
      }
    }
  }

  assertValid(data: Partial<Row>) {
    const validate = ajv.compile(this.def.schema);
    const valid = validate(data);
    if (!valid) {
      throw new Error(
        `Invalid data: ${validate.errors?.map(
          (e) => `(${e.instancePath}: ${e.message})`
        )}`
      );
    }
  }

  async assertUniqueConstraint(data: Row) {
    let valid = true;
    await this.unwind(async (event) => {
      if (
        !(await event.block.assertUniqueConstraints(data).catch(() => false))
      ) {
        valid = false;
        event.resolved = true;
      }
    });
    return valid;
  }

  isValid(data: Partial<Row>) {
    const validate = ajv.compile(this.def.schema);
    return validate(data);
  }

  query(): TableQuery<Row, Def> {
    return new TableQuery<Row, Def>(this);
  }

  lock() {
    if (this.writing) {
      throw new Error("Table is already writing");
    }
    this.writing = true;
    this.writeStartAt = Date.now();
    this.emit("/write/started");
  }

  unlock() {
    if (!this.writing) {
      return;
    }
    this.writing = false;
    this.writeStartAt = 0;
    const duration = Date.now() - this.writeStartAt;
    this.emit("/write/finished", duration);
  }

  awaitUnlock(): Promise<void> {
    if (!this.writing) {
      return Promise.resolve();
    }
    return this.once("/write/finished").then(() => {});
  }

  awaitLock(): Promise<void> {
    if (!this.writing) {
      return Promise.resolve(this.lock());
    }
    return this.once("/write/finished").then(() => {
      return this.lock();
    });
  }
}
