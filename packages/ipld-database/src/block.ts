import Minisearch from "minisearch";
import {
  BlockAggregates,
  BlockData,
  BlockFilters,
  BlockHeaders,
  TableBlockInterface,
  TableDefinition,
  TableInterface,
  TableRow,
} from "@candor/core-types";
import type { CID } from "multiformats/cid";

import * as json from "multiformats/codecs/json";
import { base58btc } from "multiformats/bases/base58";

export class TableBlock<
  Row extends TableRow = TableRow,
  Def extends TableDefinition = TableDefinition
> implements TableBlockInterface<Row, Def>
{
  public index: Minisearch;
  private _changed: boolean = false;

  constructor(
    public table: TableInterface<Row, Def>,
    public cid: CID | undefined,
    public cache: Partial<BlockData<Row>> = {}
  ) {
    this.index = this.cache.filters?.search
      ? Minisearch.loadJS(
          this.cache.filters.search,
          this.table.def.searchOptions
        )
      : new Minisearch(this.table.def.searchOptions);
  }

  get changed() {
    return this._changed;
  }

  async prevCID(): Promise<string | undefined> {
    if (this.cache.prevCID) {
      return this.cache.prevCID;
    }

    if (!this.cid) {
      return undefined;
    }

    this.cache.prevCID = await this.table.dag.load<string>(
      this.cid,
      "/prevCID"
    );

    return this.cache.prevCID;
  }

  async getCID(): Promise<CID | undefined> {
    return this.cid ? this.cid : this.save();
  }

  async headers() {
    if (!this.cache.headers && !this.cid) {
      this.cache.headers = {
        schema: this.table.def.schema.id,
        table: this.table.tableId,
        encrypted: this.table.def.encrypted,
        index: 0,
        recordsFrom: 1,
        recordsTo: 0,
      } as BlockHeaders;
    } else if (this.cid) {
      this.cache.headers = await this.table.dag.load<BlockHeaders>(
        this.cid!,
        "/headers"
      );
    }

    if (!this.cache.headers) {
      throw new Error(`Block headers not found: ${this.cid}/headers`);
    }

    return this.cache.headers;
  }

  async filters() {
    if (!this.cache.filters && !this.cid) {
      this.cache.filters = {
        indexes: {},
        aggregates: {},
      } as BlockFilters;
    } else if (!this.cache.filters) {
      this.cache.filters = await this.table.dag.load<BlockFilters>(
        this.cid!,
        "/filters"
      );
    }

    if (!this.cache.filters) {
      throw new Error(`Block filters not found: ${this.cid}/filters`);
    }

    return this.cache.filters;
  }

  async records() {
    if (!this.cache.records && !this.cid) {
      this.cache.records = {} as Record<number, Row>;
    } else if (!this.cache.records) {
      this.cache.records = await this.table.dag.load<Row[]>(
        this.cid!,
        "/records"
      );
    }

    if (!this.cache.records) {
      throw new Error(`Block records not found: ${this.cid}/records`);
    }

    return this.cache.records;
  }

  async recordById(id: number) {
    if (this.cache.records) {
      return this.cache.records[id];
    }

    return this.table.dag.load<Row>(this.cid!, `/records/${id}`);
  }

  async hasIndex(name: string) {
    const indexes = (await this.filters()).indexes;
    return indexes[name] !== undefined;
  }

  async getIndex(name: string) {
    return (await this.filters()).indexes[name];
  }

  /**
   * Determine if a value is indexed in this block
   * @param name
   * @param value
   * @returns
   */
  async hasIndexValue(name: string, value: string, key: number = 0) {
    const indexes = (await this.filters()).indexes;
    return (
      indexes[name] &&
      Object.values(indexes[name]).some((index) => {
        return key === undefined
          ? index.values.some((v) => v == value)
          : index.values[key] == value;
      })
    );
  }

  /**
   * Determine if a value is indexed in this block
   * @param name
   * @param value
   * @returns
   */
  async hasIndexValues(name: string, value: string[], id?: number) {
    const indexes = (await this.filters()).indexes;
    const serialized = TableBlock.serialize(value);
    return id
      ? indexes[name]?.[serialized]?.ids.includes(id)
      : indexes[name]?.[serialized] !== undefined;
  }

  /**
   * Remove an index from the block
   * @param index
   * @param value
   * @param id
   */
  async removeIndexWithValues(index: string, values: string[], id: number) {
    const filters = await this.filters();
    const serialized = TableBlock.serialize(values);
    if (filters.indexes[index]?.[serialized]?.ids.includes(id)) {
      filters.indexes[index][serialized].ids.splice(
        filters.indexes[index][serialized].ids.indexOf(id),
        1
      );
      if (!filters.indexes[index][serialized].ids.length) {
        delete filters.indexes[index][serialized];
      }
    }

    this.cache.filters = filters;
    this._changed = true;
  }

  /**
   * Index values in the block
   * @param index
   * @param value
   * @param id
   */
  async addIndexWithValues(index: string, values: string[], id: number) {
    if (!this.table.def.indexes[index]) {
      throw new Error(`Index ${index} not found`);
    }
    const filters = await this.filters();
    if (!filters.indexes) {
      filters.indexes = {};
    }
    if (!filters.indexes[index]) {
      filters.indexes[index] = {};
    }
    const serialized = TableBlock.serialize(values);
    if (!filters.indexes[index][serialized]) {
      filters.indexes[index][serialized] = {
        values,
        ids: [id],
      };
    } else {
      if (
        this.table.def.indexes[index].unique &&
        filters.indexes[index][serialized]?.ids.length &&
        filters.indexes[index][serialized].ids[0] !== id
      ) {
        throw new Error(
          `Unique index violation: ${index} already has value ${values}`
        );
      }
      if (!filters.indexes[index][serialized].ids.includes(id)) {
        filters.indexes[index][serialized].ids.push(id);
      }
    }

    this.cache.filters = filters;
    this._changed = true;
  }

  /**
   * Get the ids of records that match the indexed value
   * @param name
   * @param value
   * @returns
   */
  async getIndexMatchIds(name: string, value: string) {
    if (!(await this.hasIndexValue(name, value))) return [];
    const indexes = (await this.filters()).indexes;
    return Object.values(indexes[name])
      .filter((index) => index.values.includes(value))
      .map((index) => index.ids)
      .flat();
  }

  async aggregate() {
    const filters = await this.filters();
    const records = await this.records();
    const entries = Object.entries(records);
    filters.aggregates = {} as BlockAggregates;

    Object.entries(this.table.def.aggregate).forEach(([key, type]) => {
      if (type === "sum") {
        filters.aggregates[key] = entries.reduce(
          (acc, [, row]) => acc + (row[key] as number),
          0
        );
      } else if (type === "count") {
        filters.aggregates[key] = entries.reduce(
          (acc, [, row]) => acc + (row[key] ? 1 : 0),
          0
        );
      } else if (type === "avg") {
        filters.aggregates[key] = entries.reduce(
          (acc, [, row]) => acc + (row[key] as number),
          0
        );
      } else if (type === "min") {
        filters.aggregates[key] = Math.min(
          ...entries.map(([, row]) => row[key] as number)
        );
      } else if (type === "max") {
        filters.aggregates[key] = Math.max(
          ...entries.map(([, row]) => row[key] as number)
        );
      } else if (type === "distinct") {
        filters.aggregates[key] = [
          ...new Set(entries.map(([, row]) => row[key] as string)),
        ];
      } else if (type === "range") {
        filters.aggregates[key] = [
          Math.min(...entries.map(([, row]) => row[key] as number)),
          Math.max(...entries.map(([, row]) => row[key] as number)),
        ];
      }
    });

    this.cache.filters = filters;
    this._changed = true;
    return filters.aggregates;
  }

  async violatesUniqueConstraints(row: Omit<Row, "id">, id?: number) {
    for (const [name, index] of Object.entries(this.table.def.indexes)) {
      const values = index.fields.map((f) => row[f] as string);
      if (index.unique && (await this.hasIndexValues(name, values, id))) {
        return true;
      }
    }
    return false;
  }

  async assertUniqueConstraints(row: Omit<Row, "id">, id?: number) {
    for (const [name, index] of Object.entries(this.table.def.indexes)) {
      const values = index.fields.map((f) => row[f] as string);
      if (index.unique && (await this.hasIndexValues(name, values, id))) {
        throw new Error(
          `ipld-database/block: Unique index violation: index ${name} already has values: ${values}`
        );
      }
    }
  }

  async addRecord(row: Row) {
    await this.assertUniqueConstraints(row, row.id);
    if (!this.cache.headers) {
      throw new Error(
        `ipld-database/block: Cannot set record ${row.id} without headers`
      );
    }

    if (row.id > this.cache.headers!.recordsTo + 1) {
      throw new Error(
        `ipld-database/block: Record id ${row.id} is too high for this block`
      );
    }
    this.cache.headers!.recordsTo = row.id;

    // add necessary indexes
    const indexes = this.table.def.indexes;
    for (const [name, index] of Object.entries(indexes)) {
      await this.addIndexWithValues(
        name,
        index.fields.map((f) => row[f] as string),
        row.id
      );
    }

    if (!this.cache.records) {
      this.cache.records = {};
    }

    this.cache.records[row.id] = row;
    this._changed = true;
  }

  async updateRecord(id: number, update: Partial<Row>) {
    await this.assertUniqueConstraints(update as Row, id);

    const records = await this.records();
    records[id] = { ...records[id], ...update };
    this.cache.records = records;
    this._changed = true;
  }

  async deleteRecord(id: number) {
    // delete from indexes
    const indexes = this.table.def.indexes;
    for (const [name, index] of Object.entries(indexes)) {
      await this.removeIndexWithValues(
        name,
        index.fields.map((f) => this.cache.records![id][f] as string),
        id
      );
    }
    delete this.cache!.records![id];
    this._changed = true;
  }

  async search(query: string): Promise<Row[]> {
    const results = this.index.search(query);
    const records: Row[] = [];
    for (const result of results) {
      const record = await this.recordById(result.id);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  async load(force = false) {
    if (this._changed && !force) {
      throw new Error(
        "Block has unsaved changes, refusing to load without [force=true]"
      );
    }

    await this.headers();
    await this.filters();
    await this.records();
  }

  async save() {
    console.info(`ipld/block: block save requested`);
    if (!this._changed) {
      console.info("ipld/block: no changes to save");
      return this.cid;
    }

    const recordsFrom = Math.min(
      ...Object.keys(this.cache.records || {}).map(Number)
    );
    const recordsTo = Math.max(
      ...Object.keys(this.cache.records || {}).map(Number)
    );

    if (recordsFrom !== this.cache.headers!.recordsFrom) {
      console.info(`ipld/block: invalid block headers`);
      throw new Error(
        `ipld/block: recordsFrom mismatch: ${recordsFrom} (min id) !== ${
          this.cache.headers!.recordsFrom
        } (headers)`
      );
    }
    if (recordsTo !== this.cache.headers!.recordsTo) {
      console.info(`ipld/block: invalid block headers`);
      throw new Error(
        `ipld/block: recordsFrom mismatch: ${recordsTo} (max id) !== ${
          this.cache.headers!.recordsTo
        } (headers)`
      );
    }

    console.info(`ipld/block: aggregating block`);
    await this.aggregate();

    console.info(`ipld/block: storing block`);
    this.cid = this.table.encrypted
      ? await this.table.dag.storeEncrypted(
          this.toJSON() as Record<string, any>
        )
      : await this.table.dag.store(this.toJSON());

    console.info(
      `ipld/block: saved block (prev: ${this.cache.prevCID}, current: ${this.cid})`
    );

    return this.cid;
  }

  get needsRollup() {
    return (
      this.cache.headers!.recordsTo >=
      this.cache.headers!.recordsFrom + this.table.def.rollup
    );
  }

  toJSON() {
    if (!this.cache) {
      throw new Error("Block not loaded");
    }

    return this.cache as BlockData<Row>;
  }

  toString() {
    return TableBlock.serialize(this.toJSON());
  }

  static fromJSON<T extends TableRow = TableRow>(
    table: TableInterface<T>,
    cache: BlockData<T>,
    cid?: CID
  ) {
    return new TableBlock<T>(table, cid, cache);
  }

  static fromString<T extends TableRow = TableRow>(
    value: string,
    table: TableInterface,
    cid?: CID
  ) {
    return new TableBlock(
      table,
      cid,
      TableBlock.deserialize(value) as BlockData<T>
    );
  }

  static deserialize(value: string) {
    return json.decode(base58btc.decode(value));
  }

  static serialize(value: any) {
    return base58btc.encode(json.encode(value));
  }
}
