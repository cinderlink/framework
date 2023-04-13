import { sha256 } from "multiformats/hashes/sha2";
import * as json from "multiformats/codecs/json";
import type {
  BlockData,
  DIDDagInterface,
  TableBlockInterface,
} from "@cinderlink/core-types";
import { CID } from "multiformats";
import Emittery from "emittery";
import Ajv from "ajv";

import {
  TableDefinition,
  TableEvents,
  TableInterface,
  TableRow,
  TableUnwindEvent,
} from "@cinderlink/core-types/src/database/table";
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

  async insert(data: Omit<Omit<Row, "id">, "uid">) {
    this.assertValid(data as Partial<Row>);
    // console.info(`${this.tableId} > locking to insert`, data);
    await this.awaitLock();
    const id = this.currentIndex + 1;
    this.currentIndex = id + 0;
    if (!data.createdAt) {
      data.createdAt = Date.now();
    }
    if (!data.updatedAt) {
      data.updatedAt = Date.now();
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
    // console.info(`${this.tableId} > unlocking from insert`, data);
    this.unlock();
    this.emit("/record/inserted", { ...data, uid, id } as Row);
    // console.info(`table/${this.tableId} > inserted record ${id}`, data);
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
        .catch((err) => {
          errors[index] = err;
        });
    }
    return { saved, errors };
  }

  async upsert<Index extends keyof Row = keyof Row>(
    check: Record<Index, Row[Index]>,
    data: Partial<Row>
  ) {
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

    // console.info(`table/${this.tableId} > upserting record`, existing, data);

    if (existing?.uid) {
      return this.update(existing.uid, data as Row);
    } else if (data.id) {
      throw new Error(`Failed upsert with id ${data.id}, record not found`);
    }
    return this.insert({ ...check, ...data } as Omit<Row, "id">).then((id) =>
      this.getByUid(id)
    );
  }

  async update(uid: string, update: Partial<Row>) {
    const updated = (
      await this.query()
        .where("uid", "=", uid)
        .update(update)
        .returning()
        .execute()
    ).first() as Row;
    this.emit("/record/updated", updated);
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
      // console.info(
      //   `block index loaded for ${event.block.cid}`,
      //   event.block.index
      // );
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

    // console.info(
    //   `table/${this.tableId} > locking for save (${this.currentBlock.cid})`
    // );
    await this.awaitLock();
    console.info(`table/${this.tableId} > saving`, this.currentBlock.cid);
    await this.currentBlock.save();
    cache.invalidateTable(this.tableId);
    // console.info(`table/${this.tableId} > saved`, this.currentBlock.cid);

    // console.info(
    //   `table/${this.tableId} > unlocking for save (${this.currentBlock.cid})`
    // );
    this.unlock();
    return this.currentBlock.cid;
  }

  async serialize() {
    return this.currentBlock.serialize();
  }

  async deserialize(cache: BlockData<Row, Def>) {
    const block = TableBlock.fromJSON<Row, Def>(this as any, cache);
    await block.load();
    this.setBlock(block);
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
    // console.info(`table/${this.tableId} > locking table`);
    if (this.writing) {
      throw new Error("Table is already writing?!");
    }
    this.writing = true;
    this.writeStartAt = Date.now();
    this.emit("/write/started");
  }

  unlock() {
    if (!this.writing) {
      return;
    }
    // console.info(`table/${this.tableId} > unlocking table`);
    this.writing = false;
    this.writeStartAt = 0;
    const duration = Date.now() - this.writeStartAt;
    this.emit("/write/finished", duration);
  }

  awaitUnlock(): Promise<void> {
    if (!this.writing) {
      return Promise.resolve();
    }
    // console.info(`table/${this.tableId} > waiting for unlock`);
    return this.once("/write/finished").then(() => {});
  }

  awaitLock(): Promise<void> {
    try {
      return Promise.resolve(this.lock());
    } catch (e) {
      return this.once("/write/finished").then(() => {
        return this.awaitLock();
      });
    }
  }
}
