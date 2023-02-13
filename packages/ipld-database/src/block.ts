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
  public index?: Minisearch;
  private _changed: boolean = false;

  constructor(
    public table: TableInterface<Row, Def>,
    public cid: CID | undefined,
    public cache: Partial<BlockData<Row>> = {}
  ) {
    this.buildSearchIndex();
  }

  buildSearchIndex() {
    if (this.cache.filters?.search) {
      try {
        this.index = Minisearch.loadJS(
          this.cache.filters.search,
          this.table.def.searchOptions
        );
      } catch (e) {
        console.warn(`table/${this.table.tableId} > invalid search index`, e);
        this.index = new Minisearch(this.table.def.searchOptions);
        this.index.addAll(Object.values(this.cache.records || {}));
      }
      return;
    }
    this.index = new Minisearch(this.table.def.searchOptions);
    this.index.addAll(Object.values(this.cache.records || {}));
  }

  get changed() {
    return this._changed;
  }

  async loadData<Data = Row>(cid: CID, path?: string) {
    // return this.table.encrypted
    //   ? this.table.dag.loadDecrypted<Data>(cid, path)
    //   : this.table.dag.load<Data>(cid, path);
    return this.table.dag.load<Data>(cid, path);
  }

  async prevCID(): Promise<string | undefined> {
    if (this.cache.prevCID) {
      return this.cache.prevCID;
    }

    if (!this.cid) {
      return undefined;
    }

    this.cache.prevCID = await this.loadData<string>(
      this.cid,
      "/prevCID"
    ).catch(() => undefined);

    return this.cache.prevCID;
  }

  async getCID(): Promise<CID | undefined> {
    return this.cid ? this.cid : this.save();
  }

  async headers() {
    if (!this.cache.headers && this.cid) {
      this.cache.headers = (await this.loadData<BlockHeaders>(
        this.cid!,
        "/headers"
      ).catch(() => undefined)) as BlockHeaders | undefined;
    }

    if (!this.cache.headers) {
      this.cache.headers = {
        schema: this.table.def.schema.id as string,
        table: this.table.tableId,
        encrypted: this.table.def.encrypted,
        index: 0,
        recordsFrom: 1,
        recordsTo: 1,
      };
    }

    this.cache.headers.recordsFrom = Number(this.cache.headers.recordsFrom);
    this.cache.headers.recordsTo = Number(this.cache.headers.recordsTo);
    this.cache.headers.index = Number(this.cache.headers.index);
    return this.cache.headers;
  }

  async filters() {
    if (!this.cache.filters && this.cid) {
      this.cache.filters = (await this.loadData<BlockHeaders>(
        this.cid!,
        "/filters"
      ).catch(() => undefined)) as BlockFilters | undefined;
      console.info("filters", this.cache.filters);
      this.buildSearchIndex();
    }

    if (!this.cache.filters?.indexes) {
      this.cache.filters = {
        indexes: {},
        aggregates: {},
        search: this.index?.toJSON(),
      };
    }

    if (!this.cache.filters) {
      throw new Error(`Block filters not found: ${this.cid}/filters`);
    }

    return this.cache.filters;
  }

  async records() {
    if (!this.cache.records && this.cid) {
      console.info(`ipld-database/block: loading records from ${this.cid}`);
      this.cache.records = await this.loadData<Row[]>(
        this.cid!,
        "/records"
      ).catch(() => ({}));
      this.index?.removeAll();
      this.index?.addAll(Object.values(this.cache.records || {}));
    }

    if (!this.cache.records) {
      console.info(
        `ipld-database/block: creating empty records object for ${this.cid}`
      );
      this.cache.records = {};
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

    return this.loadData<Row>(this.cid!, `/records/${id}`);
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
    return (
      indexes[name]?.[serialized] !== undefined &&
      (!id ||
        !Object.values(indexes[name]?.[serialized]?.ids || {}).includes?.(id))
    );
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
    if (filters.indexes[index]?.[serialized]?.ids?.includes?.(id)) {
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
      if (!filters.indexes[index][serialized].ids?.includes?.(id)) {
        filters.indexes[index][serialized].ids?.push?.(id);
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
    if (this.cache.filters?.aggregates && !this._changed) {
      return this.cache.filters.aggregates;
    }
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
        console.error(
          `ipld-database/block: Unique index violation: index ${name} already has values: ${values}`,
          this.table.currentBlock.cache?.filters?.indexes,
          this.table.currentBlock.cache?.records
        );
        throw new Error(
          `ipld-database/block: Unique index violation: index ${name} already has values: ${values}`
        );
      }
    }
  }

  async addRecord(row: Row) {
    await this.assertUniqueConstraints(row, row.id);
    if (!this.cache.headers) {
      console.error(
        `ipld-database/block: cannot set record ${row.id} without headers`
      );
      throw new Error(
        `ipld-database/block: cannot set record ${row.id} without headers`
      );
    }

    if (row.id > this.cache.headers!.recordsTo + 1) {
      console.error(
        `ipld-database/block: record id ${row.id} is too high for this block`
      );
      throw new Error(
        `ipld-database/block: Record id ${
          row.id
        } is too high for this block (max: ${
          this.cache.headers!.recordsTo + 1
        })`
      );
    }
    this.cache.headers!.recordsTo = row.id;

    if (this.index?.has(row.id)) {
      this.index.replace(row);
    } else {
      this.index?.add(row);
    }

    if (!this.cache.records) {
      this.cache.records = {};
    }

    this.cache.records[row.id] = row;

    // add necessary indexes
    const indexes = this.table.def.indexes;
    for (const [name, index] of Object.entries(indexes)) {
      await this.addIndexWithValues(
        name,
        index.fields.map((f) => row[f] as string),
        row.id
      );
    }

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
    console.info(`ipld-database/block: deleting record ${id}`);
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
    console.info(
      `ipld-database/block: deleted record ${id}`,
      this.cache.records
    );
    this._changed = true;
  }

  async search(query: string): Promise<Row[]> {
    const results = this.index?.search(query, { fuzzy: 0.2 }) || [];
    console.info(`ipld-database/block: search results for ${query}`, results);
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

    await this.records();
    await Promise.all([
      this.prevCID(),
      this.headers(),
      this.filters(),
      this.aggregate(),
    ]);
    if (this.cache.filters?.search) {
      console.info(
        `ipld-database/block: loading search index for ${this.cid}`,
        this.cache.filters?.search
      );
      this.buildSearchIndex();
    }
  }

  async save() {
    if (!this._changed) {
      return this.cid;
    }

    console.info(
      `ipld-database/block: saving block ${this.cid}`,
      Object.keys(this.cache?.records || {}).map(Number)
    );

    if (!Object.keys(this.cache.records || {}).length) {
      console.warn(
        `ipld-database/block: no records in block ${this.cid}, skipping save...`
      );
      return;
    }

    let recordsFrom =
      Math.min(...Object.keys(this.cache.records || {}).map(Number)) || 1;
    let recordsTo =
      Math.max(...Object.keys(this.cache.records || {}).map(Number)) || 1;

    if (recordsFrom === Infinity || recordsFrom === -Infinity) {
      recordsFrom = 1;
    }
    if (recordsTo === -Infinity || recordsTo === Infinity) {
      recordsTo = 1;
    }

    if (recordsFrom !== Number(this.cache.headers!.recordsFrom) + 1) {
      throw new Error(
        `ipld/block: recordsFrom mismatch: ${recordsFrom} (min id) !== ${
          this.cache.headers!.recordsFrom + 1
        } (headers)`
      );
    }
    if (recordsTo !== Number(this.cache.headers!.recordsTo)) {
      throw new Error(
        `ipld/block: recordsTo mismatch: ${recordsTo} (max id) !== ${
          this.cache.headers!.recordsTo
        } (headers)`
      );
    }

    console.warn(
      `ipld-database/block: preparing block data for table ${this.table.tableId}`
    );

    await Promise.all([
      this.prevCID(),
      this.filters(),
      this.headers(),
      this.records(),
      this.aggregate(),
    ]);

    const data = this.toJSON();

    console.warn(
      `ipld-database/block: saving block (${this.cid}) for table ${this.table.tableId}`,
      data
    );
    this._changed = false;

    // this.cid = await (this.table.encrypted
    //   ? this.table.dag.storeEncrypted(data as Record<string, any>)
    //   : this.table.dag.store(data)
    this.cid = await this.table.dag.store(data).catch(() => {
      console.warn(
        `ipld-database/block: failed to save block (probably contains an undefined value)`,
        JSON.stringify(data, null, 2)
      );
      return undefined;
    });

    console.warn(
      `ipld-database/block: saved block (${this.cid}) for table ${this.table.tableId}`,
      data
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
    return TableBlock.pruneObject({
      ...this.cache,
      filters: {
        ...this.cache.filters,
        search: this.index?.toJSON(),
      },
    }) as unknown as BlockData<Row>;
  }

  static pruneObject(obj: Record<string, unknown>) {
    const result: Record<string, unknown> = {};
    // we have to remove undefined, empty arrays and empty objects
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        continue;
      }
      if (Array.isArray(value) && value.length === 0) {
        continue;
      }
      if (typeof value === "object") {
        if (Object.keys(value as Object).length === 0) {
          continue;
        } else {
          const pruned = TableBlock.pruneObject(
            value as Record<string, unknown>
          );
          if (Object.keys(pruned).length > 0) {
            result[key] = pruned;
          }
          continue;
        }
      }
      result[key] = value;
    }
    return result;
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
