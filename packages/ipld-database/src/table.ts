import type { CID } from "multiformats";
import type { Struct } from "superstruct";
import type { DIDDagInterface } from "@cryptids/dag-interface";
import { assert, is } from "superstruct";
import Minisearch, {
  AsPlainObject,
  Options as SearchOptions,
  SearchResult,
} from "minisearch";

export type TableRow = {
  id?: string;
  [key: string]: unknown;
};

export type TableDefinition = {
  schema: Struct<any, any>;
  indexes: string[];
  aggregate: {
    [key: string]:
      | "sum"
      | "count"
      | "avg"
      | "min"
      | "max"
      | "distinct"
      | "range";
  };
  searchOptions: SearchOptions;
  rollup: number;
};

export type TableBlock<T extends TableRow = TableRow> = {
  prevCID?: string;
  rows: T[];
  indexes: Record<string, Record<string, string[]>>;
  aggregates: Record<string, number | string | string[] | [number, number]>;
  search?: Minisearch;
  index?: AsPlainObject;
};

export class Table<T extends TableRow = TableRow> {
  currentBlock: TableBlock;

  constructor(private def: TableDefinition, private dag: DIDDagInterface) {
    this.currentBlock = this.createBlock();
  }

  createBlock(prevCID: string | undefined = this.currentBlock?.prevCID) {
    return {
      prevCID,
      rows: [],
      indexes: {},
      aggregates: {},
      search: new Minisearch(this.def.searchOptions),
    };
  }

  async insert(data: T) {
    this.assertValid(data);
    const rowCID = await this.dag.store(data);
    if (!rowCID) {
      throw new Error("Failed to store row");
    }
    data.id = rowCID.toString();
    this.currentBlock.rows.push(data);
    this.def.indexes.forEach((index) => {
      if (!this.currentBlock.indexes[index]) {
        this.currentBlock.indexes[index] = {};
      }
      const value = data[index] as string;
      if (!this.currentBlock.indexes[index][value]) {
        this.currentBlock.indexes[index][value] = [rowCID.toString()];
      } else {
        this.currentBlock.indexes[index][value].push(rowCID.toString());
      }
    });
    this.currentBlock.search?.add(data);
    if (this.currentBlock.rows.length >= this.def.rollup) {
      await this.rollup();
    }
  }

  async search(query: string, limit = 10) {
    let results: SearchResult[] = this.currentBlock.search?.search(query) || [];
    await this.unwind(async (block) => {
      const searchResults = block.search?.search(query);
      if (searchResults) {
        results = results.concat(searchResults);
      }
      return results.length < limit;
    });
    return results.slice(0, limit);
  }

  async rollup() {
    this.currentBlock.aggregates = {};
    Object.entries(this.def.aggregate).forEach(([key, type]) => {
      if (type === "sum") {
        this.currentBlock.aggregates[key] = this.currentBlock.rows.reduce(
          (acc, row) => acc + (row[key] as number),
          0
        );
      } else if (type === "count") {
        this.currentBlock.aggregates[key] = this.currentBlock.rows.length;
      } else if (type === "avg") {
        this.currentBlock.aggregates[key] = this.currentBlock.rows.reduce(
          (acc, row) => acc + (row[key] as number),
          0
        );
      } else if (type === "min") {
        this.currentBlock.aggregates[key] = Math.min(
          ...this.currentBlock.rows.map((row) => row[key] as number)
        );
      } else if (type === "max") {
        this.currentBlock.aggregates[key] = Math.max(
          ...this.currentBlock.rows.map((row) => row[key] as number)
        );
      } else if (type === "distinct") {
        this.currentBlock.aggregates[key] = [
          ...new Set(this.currentBlock.rows.map((row) => row[key] as string)),
        ];
      } else if (type === "range") {
        this.currentBlock.aggregates[key] = [
          Math.min(...this.currentBlock.rows.map((row) => row[key] as number)),
          Math.max(...this.currentBlock.rows.map((row) => row[key] as number)),
        ];
      }
    });

    this.currentBlock.index = this.currentBlock.search?.toJSON();
    delete this.currentBlock.search;
    const blockCID = await this.dag.store(this.currentBlock);
    this.currentBlock = this.createBlock(blockCID?.toString());
  }

  async save() {
    if (this.currentBlock.rows.length > 0) {
      await this.rollup();
    }
    return this.currentBlock.prevCID;
  }

  async upsert(index: string, value: string, data: Partial<T>) {
    const existing = await this.findByIndex(index, value);
    if (existing) {
    }
  }

  async load(cid: CID | string) {
    const block = await this.dag.load<TableBlock>(cid);
    if (block) {
      this.currentBlock = block;
      this.currentBlock.search = this.currentBlock.index
        ? await Minisearch.loadJS(
            this.currentBlock.index,
            this.def.searchOptions
          )
        : new Minisearch(this.def.searchOptions);
      this.currentBlock = this.createBlock();
    } else {
      this.currentBlock = this.createBlock();
    }
  }

  async unwind(test: (block: TableBlock) => Promise<boolean>) {
    let block: TableBlock | undefined = this.currentBlock;
    let prevented = false;
    while (!prevented && block) {
      prevented = !(await test(block));
      block = block.prevCID
        ? await this.dag.load<TableBlock>(block.prevCID)
        : undefined;
    }
  }

  async findByIndex(index: string, value: string) {
    let result: T | undefined;
    await this.unwind(async (block) => {
      if (block.indexes[index]?.[value]) {
        for (let rowCID of block.indexes[index][value]) {
          result = await this.dag.load<T>(rowCID);
          if (result) {
            return false;
          }
        }
      }
      return true;
    });
    return result;
  }

  assertValid(data: T) {
    assert(data, this.def.schema);
  }

  isValid(data: T) {
    return is(data, this.def.schema);
  }
}
