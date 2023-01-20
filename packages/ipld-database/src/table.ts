import type { DIDDagInterface } from "@candor/core-types";
import { CID } from "multiformats";
import Emittery from "emittery";
import Ajv from "ajv";
import Minisearch from "minisearch";
import {
  TableBlock,
  TableDefinition,
  TableEvents,
  TableInterface,
  TableRow,
} from "@candor/core-types/src/database/table";

const ajv = new Ajv();

export class Table<T extends TableRow = TableRow>
  extends Emittery<TableEvents>
  implements TableInterface<T>
{
  currentIndex: number = 0;
  currentBlock: TableBlock;
  encrypted: boolean;

  constructor(public def: TableDefinition, public dag: DIDDagInterface) {
    super();
    this.encrypted = def.encrypted;
    this.currentBlock = this.createBlock();
  }

  createBlock(prevCID: string | undefined = this.currentBlock?.prevCID) {
    return {
      prevCID,
      fromIndex: this.currentIndex,
      toIndex: this.currentIndex + this.def.rollup,
      records: {},
      indexes: {},
      aggregates: {},
      search: new Minisearch(this.def.searchOptions),
    };
  }

  async insert(data: T) {
    this.assertValid(data);
    const rowCID = this.encrypted
      ? await this.dag.storeEncrypted(data)
      : await this.dag.store(data);
    if (!rowCID) {
      throw new Error("Failed to store row");
    }
    data.id = this.currentIndex++;
    this.currentBlock.records[data.id] = data;
    this.def.indexes.forEach((index) => {
      if (!this.currentBlock.indexes[index]) {
        this.currentBlock.indexes[index] = {};
      }
      const value = data[index] as string;
      if (!this.currentBlock.indexes[index][value]) {
        this.currentBlock.indexes[index][value] = [data.id as number];
      } else {
        this.currentBlock.indexes[index][value].push(data.id as number);
      }
    });
    this.currentBlock.search?.add(data);
    if (this.currentIndex - this.currentBlock.fromIndex >= this.def.rollup) {
      await this.rollup();
    }

    return data.id;
  }

  async search(query: string, limit = 10) {
    let results: T[] = [];
    await this.unwind(async (block) => {
      const searchResults = block.search?.search(query);
      const searchIds = [...new Set(searchResults?.map((r) => r.id) || [])];
      const records: T[] = searchIds.map((id) => block.records[id] as T);
      if (records) {
        results = results.concat(records);
      }
      return results.length < limit;
    });
    return results.slice(0, limit);
  }

  async rollup() {
    this.currentBlock = this.updateBlockAggregates(this.currentBlock);
    this.currentBlock.index = this.currentBlock.search?.toJSON();
    this.currentBlock.toIndex = this.currentIndex;
    delete this.currentBlock.search;
    if (!this.currentBlock.prevCID) {
      // can't save undefined
      delete this.currentBlock.prevCID;
    }
    const blockCID = this.encrypted
      ? await this.dag.storeEncrypted(this.currentBlock)
      : await this.dag.store(this.currentBlock);
    this.currentBlock = this.createBlock(blockCID?.toString());
  }

  updateBlockAggregates(block: TableBlock) {
    block.aggregates = {};
    const records = Object.values(block.records);
    Object.entries(this.def.aggregate).forEach(([key, type]) => {
      if (type === "sum") {
        block.aggregates[key] = records.reduce(
          (acc, row) => acc + (row[key] as number),
          0
        );
      } else if (type === "count") {
        block.aggregates[key] = records.reduce(
          (acc, row) => acc + (row[key] ? 1 : 0),
          0
        );
      } else if (type === "avg") {
        block.aggregates[key] = records.reduce(
          (acc, row) => acc + (row[key] as number),
          0
        );
      } else if (type === "min") {
        block.aggregates[key] = Math.min(
          ...records.map((row) => row[key] as number)
        );
      } else if (type === "max") {
        block.aggregates[key] = Math.max(
          ...records.map((row) => row[key] as number)
        );
      } else if (type === "distinct") {
        block.aggregates[key] = [
          ...new Set(records.map((row) => row[key] as string)),
        ];
      } else if (type === "range") {
        block.aggregates[key] = [
          Math.min(...records.map((row) => row[key] as number)),
          Math.max(...records.map((row) => row[key] as number)),
        ];
      }
    });
    return block;
  }

  async save() {
    if (Object.values(this.currentBlock.records).length > 0) {
      await this.rollup();
    }
    return this.currentBlock.prevCID;
  }

  async update(id: number, data: Partial<T>) {
    // we want to seek backwards from the current block
    // to find the block containing the row with the given id
    // we then want to update the row in that block
    // and then re-write that block and all subsequent blocks
    // to update the indexes, aggregates, and CID references
    // we also want to update the search index

    let blocksUnwound: string[] = [];
    let rewriteBlock: TableBlock | undefined = undefined;

    const unwindFn = async (block: TableBlock, cid: string | undefined) => {
      // if the block contains the row we want to update
      const row = block.records[id];
      const updated = { ...row, ...data };
      if (row) {
        block.records[id] = updated;
        // update the indexes
        this.def.indexes.forEach((index) => {
          // if the index has changed
          if (updated[index] && updated[index] !== row[index]) {
            // remove the row from the old index
            block.indexes[index][row[index] as string] = block.indexes[index][
              row[index] as string
            ].filter((rowID) => rowID !== id);
            // add the row to the new index
            if (!block.indexes[index][updated[index] as string]) {
              block.indexes[index][updated[index] as string] = [id];
            } else {
              block.indexes[index][updated[index] as string].push(id);
            }
          }
        });
        if (cid) {
          // update the aggregates
          block = this.updateBlockAggregates(block);
          // update the search index
          block.search?.removeAll();
          block.search?.addAll(Object.values(block.records));
          // update the CID reference
          rewriteBlock = block;
        }
        return false;
      }
      return true;
    };

    await this.unwind(unwindFn);

    // rewrite the blocks
    if (rewriteBlock) {
      let prevCID = this.encrypted
        ? await this.dag.storeEncrypted(rewriteBlock)
        : await this.dag.store(rewriteBlock);
      for (const cid of blocksUnwound) {
        const block = this.encrypted
          ? await this.dag.loadDecrypted<TableBlock>(cid)
          : await this.dag.load<TableBlock>(cid);
        if (block) {
          block.prevCID = prevCID?.toString();
          prevCID = this.encrypted
            ? await this.dag.storeEncrypted(block)
            : await this.dag.store(block);
        }
      }
    }

    return id;
  }

  async load(cid: CID | string) {
    const block = this.encrypted
      ? await this.dag.loadDecrypted<TableBlock>(cid)
      : await this.dag.load<TableBlock>(cid);
    if (block) {
      this.currentBlock = block;
      this.currentBlock.search = this.currentBlock.index
        ? await Minisearch.loadJS(
            this.currentBlock.index,
            this.def.searchOptions
          )
        : new Minisearch(this.def.searchOptions);
      this.currentIndex = block.toIndex;
      // this.currentBlock = this.createBlock(cid.toString());
    } else {
      this.currentBlock = this.createBlock();
    }
    this.emit("/table/loaded");
  }

  async unwind(
    test: (block: TableBlock, cid: string | undefined) => Promise<boolean>
  ) {
    let cid: string | undefined = undefined;
    let block: TableBlock | undefined = this.currentBlock;
    let prevented = false;
    while (prevented === false && block) {
      prevented = !(await test(block, cid).catch((err) => {
        console.error("unwind error", err);
        return false;
      }));
      if (prevented) {
        cid = undefined;
        block = undefined;
        return;
      }
      cid = block.prevCID;
      block = block.prevCID
        ? this.encrypted
          ? await this.dag.loadDecrypted<TableBlock>(block.prevCID)
          : await this.dag.load<TableBlock>(block.prevCID)
        : undefined;
    }
  }

  async findByIndex(index: string, value: string) {
    let result: T | undefined;
    await this.unwind(async (block) => {
      if (block.indexes[index]?.[value]) {
        for (let rowID of block.indexes[index][value]) {
          result = block.records[rowID] as T;
          if (result) {
            return false;
          }
        }
      }
      return true;
    });
    return result;
  }

  async where(match: (row: T) => boolean) {
    const results: T[] = [];
    await this.unwind(async (block) => {
      for (let row of Object.values(block.records)) {
        if (match(row as T)) {
          results.push(row as T);
        }
      }
      return true;
    });
    return results;
  }

  async find(match: (row: T) => boolean) {
    let result: T | undefined;
    await this.unwind(async (block) => {
      for (let row of Object.values(block.records)) {
        if (match(row as T)) {
          result = row as T;
          return false;
        }
      }
      return true;
    });
    return result;
  }

  async upsert(index: string, value: string | number, data: T) {
    const existing = await this.findByIndex(index, value as string);
    if (existing?.id) {
      return this.update(existing.id, data);
    }
    const record = { [index]: value, ...data };
    return this.insert(record);
  }

  assertValid(data: T) {
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

  isValid(data: T) {
    const validate = ajv.compile(this.def.schema);
    return validate(data);
  }
}
