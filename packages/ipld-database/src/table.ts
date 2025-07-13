import { sha256 } from "multiformats/hashes/sha2";
import * as json from "multiformats/codecs/json";
import { BlockData, DIDDagInterface, SubLoggerInterface, TableBlockInterface, TableDefinition, TableEvents, TableInterface, TableRow, TableUnwindEvent } from "@cinderlink/core-types";
import { CID } from "multiformats";
import Emittery from "emittery";
import type { SchemaRegistryInterface } from "@cinderlink/schema-registry";

import { TableBlock } from "./block.js";
import { TableQuery } from "./query.js";
import { cache } from "./cache.js";

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
    public dag: DIDDagInterface,
    public logger: SubLoggerInterface,
    public schemaRegistry?: SchemaRegistryInterface
  ) {
    super();
    this.encrypted = def.encrypted;
    this.currentBlock = this.createBlock(undefined);
  }

  createBlock(prevCID: string | undefined): TableBlockInterface<Row, Def> {
    return new TableBlock<Row, Def>(
      this,
      undefined,
      {
        prevCID,
        headers: {
          table: this.tableId,
          schema: this.def.schemaId,
          recordsFrom: this.currentIndex,
          recordsTo: this.currentIndex,
          encrypted: this.encrypted,
          index: this.currentBlockIndex,
        },
      },
      this.logger
    );
  }

  setBlock(block: TableBlockInterface<Row, Def>) {
    this.currentBlock = block;
    this.currentBlockIndex = Number(block.cache!.headers!.index) || 0;
    this.currentIndex = Number(block.cache!.headers!.recordsTo) || 0;
    this.emit("/block/saved", block);
  }

  async insert(data: Omit<Omit<Row, "id">, "uid">) {
    this.assertValid(data as Partial<Row>);
    await this.awaitLock();
    const id = this.currentIndex + 1;
    this.currentIndex = id + 0;
    if (!(data as any).createdAt) {
      (data as any).createdAt = Date.now();
    }
    if (!(data as any).updatedAt) {
      (data as any).updatedAt = Date.now();
    }
    const sorted = Table.sortObject(data) as Omit<Omit<Row, "id">, "uid">;
    const uid = await this.computeUid(sorted);
    await this.assertUniqueConstraint({ id, uid, ...sorted } as Row);
    await this.currentBlock.addRecord({ id, uid, ...sorted } as Row);
    if (
      Object.values(this.currentBlock.cache?.records || {}).length >=
      (this.def.rollup || 1000)
    ) {
      const cid = await this.currentBlock.save();
      if (cid) {
        this.currentBlock = this.createBlock(cid.toString());
      }
    }
    cache.invalidateTable(this.tableId);
    this.unlock();
    await this.emit("/record/inserted", { ...data, uid, id } as Row).catch(
      (error: Error) => {
        this.logger.error(`error emitting table insert: ${error.message}`, {
          stack: error.stack,
        });
      }
    );
    return uid;
  }

  static sortObject(object: Record<string, unknown>) {
    return Object.keys(object)
      .sort()
      .reduce((obj, key) => {
        obj[key] = object[key];
        return obj;
      }, {} as Record<string, unknown>);
  }

  async computeUid(data: Omit<Omit<Row, "id">, "uid">): Promise<string> {
    const sorted = Table.sortObject(data) as Omit<Omit<Row, "id">, "uid">;
    const uniqueFields: (keyof Row)[] | undefined = Object.values(
      this.def.indexes
    ).find((index) => index.unique)?.fields;

    const uidData = uniqueFields?.length
      ? uniqueFields.reduce((obj, key) => {
          obj[key as keyof Omit<Omit<Row, "id">, "uid">] =
            sorted[key as keyof Omit<Omit<Row, "id">, "uid">];
          return obj;
        }, {} as Omit<Omit<Row, "id">, "uid">)
      : sorted;

    return CID.create(
      1,
      json.code,
      await sha256.digest(json.encode(uidData))
    ).toString();
  }

  async bulkInsert(data: Omit<Omit<Row, "id">, "uid">[]) {
    const saved: string[] = [];
    const errors: Record<number, string> = {};
    for (const index in data) {
      const row = data[index];
      await this.insert(row)
        .then((uid) => {
          saved.push(uid);
        })
        .catch((err: Error) => {
          errors[index] = err.message;
        });
    }
    return { saved, errors };
  }

  async upsert<Index extends keyof Row = keyof Row>(
    check: Record<Index, Row[Index]>,
    data: Partial<Row>
  ) {
    if (!data) {
      this.logger.error(`upsert failed: no data provided`);
      throw new Error(`upsert failed: no data provided`);
    }

    this.assertValid(data);
    const existing = check["id" as Index]
      ? await this.getById(check["id" as Index] as number)
      : check["uid" as Index]
      ? await this.getByUid(check["uid" as Index] as string)
      : await this.query()
          .and((qb) => {
            for (const index in check) {
              qb.where(index, "=", check[index] as Row[Index]);
            }
          })
          .select()
          .execute()
          .then((r) => r.first());

    this.logger.debug(`upserting record`, { existing, data });

    if (existing?.uid) {
      return this.update(existing.uid, data as Row);
    } else if (data.id) {
      this.logger.error(`upsert failed: id ${data.id} not found`);
      throw new Error(`Upsert failed: id ${data.id} not found`);
    }
    return this.insert({ ...check, ...data } as Omit<Row, "id">).then((id) =>
      this.getByUid(id)
    );
  }

  async update(uid: string, update: Partial<Row>) {
    if (!update) {
      this.logger.error(`update failed: no data provided`);
      throw new Error(`update failed: no data provided`);
    }
    const updated = (
      await this.query()
        .where("uid", "=", uid)
        .update(update)
        .returning()
        .execute()
    ).first() as Row;
    cache.invalidateTable(this.tableId);
    return updated;
  }

  async getById(id: number) {
    await this.awaitUnlock();
    const results = await this.query().where("id", "=", id).select().execute();
    return results.first();
  }

  async getByUid(uid: string) {
    await this.awaitUnlock();
    const results = await this.query()
      .where("uid", "=", uid)
      .select()
      .execute();
    return results.first();
  }

  async getAllById(ids: number[]) {
    await this.awaitUnlock();
    const results = await this.query()
      .where("id", "in", ids)
      .select()
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
      this.logger.info(`index loaded for block (${event.block.cid || "new"})`);
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
    if (!this.currentBlock.changed) {
      return this.currentBlock.cid;
    }
    await this.awaitLock();
    this.logger.debug(`saving`, { currentBlock: this.currentBlock.cid });
    await this.currentBlock.save();
    cache.invalidateTable(this.tableId);
    this.logger.info(`saved`, { currentBlock: this.currentBlock.cid });
    this.unlock();
    return this.currentBlock.cid;
  }

  serialize() {
    return this.currentBlock.serialize();
  }

  async deserialize(cache: BlockData<Row, Def>) {
    const block = TableBlock.fromJSON<Row, Def>(this, cache);
    await block.load();
    this.setBlock(block);
  }

  async load(cid: CID) {
    const block = new TableBlock<Row, Def>(this, cid, undefined, this.logger);
    await block.load();
    this.setBlock(block);
  }

  hasChanges() {
    return this.currentBlock.changed;
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
        this.logger.error(`error in unwind callback: ${e.message}`, {
          stack: e.stack,
        });
      });

      const prevCID = await event.block?.prevCID();
      event.cid = !event.resolved ? prevCID : undefined;
      if (!event.cid) {
        event.resolved = true;
      } else {
        event.block = new TableBlock<Row, Def>(
          this,
          CID.parse(event.cid),
          undefined,
          this.logger
        );
      }
    }
  }

  assertValid(data: Partial<Row>) {
    if (!this.schemaRegistry) {
      // Legacy behavior - skip validation if no registry
      this.logger.warn('No schema registry provided, skipping validation');
      return;
    }

    const result = this.schemaRegistry.validate(
      this.def.schemaId,
      this.def.schemaVersion,
      data
    );

    if (!result.success) {
      this.logger.error(`invalid data`, { data, error: result.error });
      throw new Error(
        `Invalid data: ${result.error.issues.map(
          (e) => `(${e.path.join('.')}: ${e.message})`
        ).join(', ')}`
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
    if (!this.schemaRegistry) {
      // Legacy behavior - assume valid if no registry
      return true;
    }

    const result = this.schemaRegistry.validate(
      this.def.schemaId,
      this.def.schemaVersion,
      data
    );

    return result.success;
  }

  query(): TableQuery<Row, Def> {
    return new TableQuery<Row, Def>(this, undefined, this.logger);
  }

  lock() {
    if (this.writing) {
      this.logger.error(`table lock exists`, {
        writeStartAt: this.writeStartAt,
      });
      throw new Error("Table lock exists");
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
      return this.awaitLock();
    });
  }
}
