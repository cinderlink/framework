import Minisearch from "minisearch";
import {
  BlockAggregates,
  BlockData,
  BlockFilters,
  BlockHeaders,
  BlockIndexes,
  SubLoggerInterface,
  TableBlockInterface,
  TableDefinition,
  TableInterface,
  TableRow,
} from "@cinderlink/core-types";
import type { CID } from "multiformats/cid";

import * as json from "multiformats/codecs/json";
import { base58btc } from "multiformats/bases/base58";
import { cache } from "./cache.js";

export class TableBlock<
  Row extends TableRow = TableRow,
  Def extends TableDefinition<Row> = TableDefinition<Row>
> implements TableBlockInterface<Row, Def>
{
  public index?: Minisearch;
  public changed: boolean = false;

  constructor(
    public table: TableInterface<Row, Def>,
    public cid: CID | undefined,
    public cache: Partial<BlockData<Row, Def>> = {},
    public logger: SubLoggerInterface
  ) {
    this.buildSearchIndex();
  }

  get logPrefix() {
    return `table/${this.table.tableId}/block/${this.cid?.toString() || "new"}`;
  }

  buildSearchIndex() {
    if (this.cache.filters?.search && typeof this.cache.filters.search === 'object') {
      try {
        this.index = Minisearch.loadJS(
          this.cache.filters.search,
          this.table.def.searchOptions
        );
      } catch (_error) {
        this.logger.warn(`failed to load search index from cache`, { error });
        this.index = new Minisearch(this.table.def.searchOptions);
        this.index.addAll(Object.values(this.cache.records || {}));
      }
      return;
    }
    this.index = new Minisearch(this.table.def.searchOptions);
    this.index.addAll(Object.values(this.cache.records || {}));
  }

  async loadData<Data = Row>(cid: CID, path?: string, options?: any) {
    // return this.table.encrypted
    //   ? this.table.dag.loadDecrypted<Data>(cid, path)
    //   : this.table.dag.load<Data>(cid, path);
    try {
      const data = await this.table.dag
        .load<Data>(cid, path, options)
        .catch(() => undefined);
      return data;
    } catch (error: any) {
      this.logger.error(`failed to load data from dag`, {
        cid,
        path,
        error,
        stack: error.stack,
      });
      throw error;
    }
  }

  prevCID(): Promise<string | undefined> {
    if (this.cache.prevCID) {
      return this.cache.prevCID;
    }

    if (!this.cid) {
      return undefined;
    }

    this.cache.prevCID = await this.loadData<string>(this.cid, "/prevCID", {
      suppressErrors: true,
    }).catch(() => undefined);

    return this.cache.prevCID;
  }

  getCID(): Promise<CID | undefined> {
    return this.cid ? this.cid : this.save();
  }

  async headers() {
    if (!this.cache.headers && this.cid) {
      this.cache.headers = (await this.loadData<BlockHeaders>(
        this.cid!,
        "/headers",
        { suppressErrors: true }
      ).catch(() => undefined)) as BlockHeaders | undefined;
    }

    if (!this.cache.headers) {
      this.cache.headers = {
        schema: this.table.def.schema?.id as string || this.table.def.schemaId,
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
      this.cache.filters = (await this.loadData<BlockFilters<Row, Def>>(
        this.cid!,
        "/filters",
        { suppressErrors: true }
      ).catch(() => undefined)) as BlockFilters<Row, Def> | undefined;
      this.buildSearchIndex();
    }

    if (!this.cache.filters?.indexes) {
      this.cache.filters = {
        indexes: {},
        aggregates: {} as BlockAggregates<Row>,
        search: this.index?.toJSON(),
      } as BlockFilters<Row, Def>;
    }

    if (!this.cache.filters) {
      throw new Error(`Block filters not found: ${this.cid}/filters`);
    }

    return this.cache.filters;
  }

  records() {
    if (!this.cache.records && this.cid) {
      this.logger.debug(`loading records from ${this.cid || "new block"}`);
      this.cache.records = await this.loadData<Row[]>(this.cid!, "/records", {
        suppressErrors: true,
      }).catch(() => ({}));
      this.index?.removeAll();
      this.index?.addAll(Object.values(this.cache.records || {}));
    }

    if (!this.cache.records) {
      this.logger.debug(
        `creating empty records object for ${this.cid || "new block"}`
      );
      this.cache.records = {};
    }

    if (!this.cache.records) {
      this.logger.error(`block records not found: ${this.cid || "new block"}`);
      throw new Error(`Block records not found: ${this.cid || "new block"}`);
    }

    return this.cache.records;
  }

  recordById(id: number) {
    if (this.cache.records) {
      return this.cache.records[id];
    }

    return this.loadData<Row>(this.cid!, `/records/${id}`, {
      suppressErrors: true,
    }).catch(() => undefined);
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
  async hasIndexValue(
    name: keyof Def["indexes"],
    value: Row[keyof Row],
    key: number = 0
  ) {
    const indexes = (await this.filters()).indexes;
    return (
      indexes[name] &&
      Object.values(indexes[name]).some((index) => {
        return key === undefined
          ? index.values.some((v) => v === value)
          : index.values[key] === value;
      })
    );
  }

  /**
   * Determine if a value is indexed in this block
   * @param name
   * @param value
   * @returns
   */
  async hasIndexValues(
    name: string,
    value: Partial<Row>[keyof Row][],
    id?: number
  ) {
    const indexes = (await this.filters()).indexes;
    const serialized = TableBlock.serializeValue(value);
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
    const serialized = TableBlock.serializeValue(values);
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
    this.changed = true;
  }

  /**
   * Index values in the block
   * @param index
   * @param value
   * @param id
   */
  addIndexWithValues(
    index: keyof Def["indexes"],
    values: Row[keyof Row][],
    id: number
  ) {
    if (!this.table.def.indexes[index as string]) {
      throw new Error(`Index ${index as string} not found`);
    }
    const filters = await this.filters();
    if (!filters.indexes) {
      filters.indexes = {} as BlockIndexes<Row, Def>;
    }
    if (!filters.indexes[index]) {
      filters.indexes[index] = {};
    }
    const serialized = TableBlock.serializeValue(values);
    if (!filters.indexes[index][serialized]) {
      filters.indexes[index as string][serialized] = {
        values: values as Row[keyof Row][],
        ids: [id],
      };
    } else {
      if (
        this.table.def.indexes[index as string].unique &&
        filters.indexes[index][serialized]?.ids.length &&
        filters.indexes[index][serialized].ids[0] !== id
      ) {
        throw new Error(
          `Unique index violation: ${
            index as string
          } already has value ${values}`
        );
      }
      if (!filters.indexes[index][serialized].ids?.includes?.(id)) {
        filters.indexes[index][serialized].ids?.push?.(id);
      }
    }

    this.cache.filters = filters;
    this.changed = true;
  }

  /**
   * Get the ids of records that match the indexed value
   * @param name
   * @param value
   * @returns
   */
  async getIndexMatchIds(name: keyof Def["indexes"], value: Row[keyof Row]) {
    if (!(await this.hasIndexValue(name, value))) return [];
    const indexes = (await this.filters()).indexes;
    return Object.values(indexes[name])
      .filter((index) => index.values.includes(value))
      .map((index) => index.ids)
      .flat();
  }

  aggregate() {
    if (this.cache.filters?.aggregates && !this.changed) {
      return this.cache.filters.aggregates;
    }
    const filters = await this.filters();
    const records = await this.records();
    const entries = Object.entries(records);
    filters.aggregates = {} as BlockAggregates<Row>;

    Object.entries(this.table.def.aggregate).forEach(([key, type]) => {
      const _key = key as keyof Row;
      if (type === "sum") {
        filters.aggregates[_key] = entries.reduce(
          (acc, [, row]) => acc + (row[_key] as number),
          0
        ) as number;
      } else if (type === "count") {
        filters.aggregates[_key] = entries.reduce(
          (acc, [, row]) => acc + (row[_key] ? 1 : 0),
          0
        ) as number;
      } else if (type === "avg") {
        filters.aggregates[_key] =
          entries.reduce((acc, [, row]) => acc + (row[_key] as number), 0) /
          entries.length;
      } else if (type === "min") {
        filters.aggregates[_key] = Math.min(
          ...entries.map(([, row]) => row[_key] as number)
        );
      } else if (type === "max") {
        filters.aggregates[_key] = Math.max(
          ...entries.map(([, row]) => row[_key] as number)
        );
      } else if (type === "distinct") {
        filters.aggregates[_key] = [
          ...new Set(entries.map(([, row]) => row[_key] as string)),
        ];
      } else if (type === "range") {
        filters.aggregates[_key] = [
          Math.min(...entries.map(([, row]) => row[_key] as number)),
          Math.max(...entries.map(([, row]) => row[_key] as number)),
        ];
      }
    });

    this.cache.filters = filters;
    return filters.aggregates;
  }

  async violatesUniqueConstraints(row: Partial<Row>, id?: number) {
    for (const [name, index] of Object.entries(this.table.def.indexes)) {
      const values = index.fields.map((f) => row[f] as Row[keyof Row]);
      if (index.unique && (await this.hasIndexValues(name, values, id))) {
        return true;
      }
    }
    return false;
  }

  async assertUniqueConstraints(row: Partial<Row>, id?: number) {
    for (const [name, index] of Object.entries(this.table.def.indexes)) {
      const values = index.fields.map((f) => row[f] as Row[keyof Row]);
      if (index.unique && (await this.hasIndexValues(name, values, id))) {
        this.logger.error(
          `unique index violation: ${this.table.def.schemaId}.${this.table.tableId}.${name}`,
          {
            schema: this.table.def.schemaId,
            table: this.table.tableId,
            index,
            row,
            values,
          }
        );
        throw new Error(
          `unique index violation: ${this.table.def.schemaId}.${this.table.tableId}.${name}`
        );
      }
    }
  }

  async addRecord(row: Row) {
    this.table.assertValid(row);
    await this.assertUniqueConstraints(row, row.id);
    if (!this.cache.headers) {
      this.logger.error(`cannot set record ${row.id} without headers`);
      throw new Error(`Cannot set record ${row.id} without headers`);
    }

    if (row.id > this.cache.headers!.recordsTo + 1) {
      this.logger.error(`record id ${row.id} out of bounds`, {
        row,
        headers: this.cache.headers,
      });
      throw new Error(
        `Record id ${row.id} out of bounds (max: ${
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
        index.fields.map((f) => row[f]),
        row.id
      );
    }

    this.changed = true;
  }

  async updateRecord(
    id: number,
    update: Partial<Row>
  ): Promise<Row | undefined> {
    this.table.assertValid(update);
    await this.assertUniqueConstraints(update as Row, id);
    const records = await this.records();
    const hasChanged = Object.entries(update).some(([key, value]) => {
      const changed = records[id][key as keyof Row] !== value;
      if (changed && key !== "updatedAt") {
        this.logger.debug(
          `change detected on record ${id} (${key}: ${
            records[id][key as keyof Row]
          } !== ${value})`
        );
        return true;
      }
      return false;
    });
    if (!hasChanged) {
      return;
    }
    records[id] = {
      ...records[id],
      ...update,
      updatedAt: update.updatedAt || Date.now(),
    };
    this.cache.records = records;
    this.changed = true;
    return records[id];
  }

  deleteRecord(id: number) {
    this.logger.debug(`deleting record ${id}`);
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
    this.logger.debug(`deleted record ${id}`);
    this.changed = true;
  }

  search(query: string): Promise<Row[]> {
    const results = this.index?.search(query, { fuzzy: 0.2 }) || [];
    this.logger.info(`${results.length} search results for ${query}`, {
      query,
      results,
    });
    const records: Row[] = [];
    for (const result of results) {
      const record = await this.recordById(result.id);
      if (record) {
        records.push(record);
      }
    }

    return records;
  }

  load(force = false) {
    if (this.changed && !force) {
      this.logger.error(
        `block has unsaved changes, refusing to load without [force=true]`,
        {
          schemaId: this.table.def.schemaId,
          tableId: this.table.tableId,
          block: this.cid?.toString() || "new",
        }
      );
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
    cache.cacheBlock(this);
    if (this.cache.filters?.search) {
      this.logger.info(
        `loading search index for ${this.cid?.toString() || "new block"}`,
        { search: this.cache.filters?.search, block: this.cid?.toString() }
      );
      this.buildSearchIndex();
    }
  }

  serialize(): Promise<BlockData<Row> | undefined> {
    if (!this.changed) {
      if (
        !Object.keys(this.cache?.records || {}).length &&
        !this.cache.prevCID
      ) {
        this.logger.warn(
          `no records in block without changes (${
            this.cid?.toString() || "new"
          }), skipping save...`
        );
        return undefined;
      }
      return this.cache as BlockData<Row, TableDefinition<Row>>;
    }

    const prevCID = await this.prevCID();
    const records = await this.records();
    if (Object.keys(records || {}).length === 0 && !prevCID) {
      this.logger.warn(
        `no records in block without prevCID (${
          this.cid?.toString() || "new"
        }), skipping save...`
      );
      return undefined;
    }

    this.logger.info(`saving block (${this.cid?.toString() || "new"})`, {
      ids: Object.keys(this.cache?.records || {}).map(Number),
    });

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

    if (
      Number(recordsFrom) !==
      Number(this.cache.headers!.recordsFrom || 0) + 1
    ) {
      this.logger.error(
        `header index out of bounds: ${recordsFrom} (min id) !== ${
          this.cache.headers!.recordsFrom + 1
        } (headers)`,
        {
          recordsFrom,
          recordsTo,
          headers: this.cache.headers,
        }
      );
      throw new Error(
        `header index out of bounds: ${recordsFrom} (min id) !== ${
          this.cache.headers!.recordsFrom + 1
        } (headers)`
      );
    }
    if (Number(recordsTo) !== Number(this.cache.headers!.recordsTo)) {
      this.logger.warn(
        `header index out of bounds: ${recordsTo} (max id) !== ${
          this.cache.headers!.recordsTo
        } (headers)'`,
        { recordsFrom, recordsTo, headers: this.cache.headers }
      );
      throw new Error(
        `header index out of bounds: ${recordsTo} (max id) !== ${
          this.cache.headers!.recordsTo
        } (headers)`
      );
    }

    this.logger.debug(`preparing block (${this.cid?.toString() || "new"})`);

    await Promise.all([
      this.prevCID(),
      this.filters(),
      this.headers(),
      this.records(),
      this.aggregate(),
    ]);

    const data = this.toJSON();

    this.logger.debug(`saving block (${this.cid?.toString() || "new"})`);

    this.cid = await this.table.dag.store(data).catch((error) => {
      this.logger.error(`failed to save block`, { data, error });
      return undefined;
    });

    this.logger.info(`saved block (${this.cid})`);

    cache.invalidateTable(this.table.tableId);
    this.changed = false;

    return data;
  }

  async save() {
    await this.serialize();
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
      this.logger.error(
        `block (${
          this.cid?.toString() || "new"
        }) not loaded, cannot call toJSON`
      );
      throw new Error("toJSON error: block not loaded");
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
        if (Object.keys(value as object).length === 0) {
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
    return TableBlock.serializeValue(this.toJSON());
  }

  static fromJSON<
    T extends TableRow = TableRow,
    D extends TableDefinition<T> = TableDefinition<T>
  >(table: TableInterface<T, D>, cache: BlockData<T, D>, cid?: CID) {
    return new TableBlock<T, D>(table, cid, cache, table.logger);
  }

  static fromString<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(value: string, table: TableInterface<Row, Def>, cid?: CID) {
    return new TableBlock<Row, Def>(
      table,
      cid,
      TableBlock.deserializeValue(value) as BlockData<Row, Def>,
      table.logger
    );
  }

  static deserializeValue(value: string) {
    return json.decode(base58btc.decode(value));
  }

  static serializeValue(value: any) {
    return base58btc.encode(json.encode(value));
  }
}
