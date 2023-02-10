import { TestDIDDag } from "@candor/test-adapters/src/dag";
import { createSeed, createDID } from "../../client";
import type { DID } from "dids";
import { describe, it, expect, beforeEach } from "vitest";
import { Table } from "./table";
import { BlockData, TableDefinition } from "@candor/core-types";

const validDefinition: TableDefinition = {
  schemaId: "test",
  encrypted: false,
  indexes: {
    name: {
      unique: true,
      fields: ["name"],
    },
  },
  aggregate: {
    count: "max",
  },
  schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      count: { type: "number" },
    },
  },
  searchOptions: {
    fields: ["name", "id"],
  },
  rollup: 10,
};

let seed: Uint8Array;
let dag: TestDIDDag;
let did: DID;
describe("@candor/ipld-database/table", () => {
  beforeEach(async () => {
    seed = await createSeed("test seed");
    did = await createDID(seed);
    dag = new TestDIDDag(did);
  });

  it("should create a current block", () => {
    const table = new Table("test", validDefinition, dag);
    expect(table.currentBlock).toMatchSnapshot();
  });

  it("should validate records", () => {
    const table = new Table("test", validDefinition, dag);
    expect(() => table.assertValid({ name: "foo", count: 1 })).not.toThrow();
    expect(() => table.assertValid({ name: "foo", count: "1" })).toThrow();
    expect(() => table.assertValid({ name: 1, count: 1 })).toThrow();
  });

  it("should insert records", async () => {
    const table = new Table("test", validDefinition, dag);
    const id = await table.insert({ name: "foo", count: 1 });
    expect(Object.values(table.currentBlock.cache?.records || {}).length).toBe(
      1
    );
    expect(id).toBe(1);
    const results = await table.query().select().where("id", "=", id).execute();
    expect(results).toMatchInlineSnapshot(`
      TableQueryResult {
        "rows": [
          {
            "count": 1,
            "id": 1,
            "name": "foo",
          },
        ],
      }
    `);
    const record = results.first();
    expect(record).toMatchInlineSnapshot(`
      {
        "count": 1,
        "id": 1,
        "name": "foo",
      }
    `);
  });

  it("should index records", async () => {
    const table = new Table("test", validDefinition, dag);
    await table.insert({ name: "foo", count: 1 });
    expect(table.currentBlock.cache?.filters?.indexes).toMatchSnapshot();
  });

  it("should search records", async () => {
    const table = new Table("test", validDefinition, dag);
    await table.insert({ name: "foo", count: 1 });
    await table.insert({ name: "bar", count: 1 });
    await table.insert({ name: "baz", count: 1 });
    const results = await table.search("foo");
    expect(results).toMatchInlineSnapshot("[]");
  });

  it("should rollup records", async () => {
    const table = new Table("test", validDefinition, dag);
    for (let i = 0; i < 1000; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    expect(table.currentIndex).toBe(1001);
    expect(table.currentBlock.cache?.prevCID).not.toBeUndefined();
  });

  it("should aggregate records", async () => {
    const table = new Table("test", validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const prevBlock = await dag.load<BlockData>(
      table.currentBlock.cache!.prevCID! as any
    );
    expect(prevBlock?.filters.aggregates).toMatchInlineSnapshot(`
      {
        "count": 9,
      }
    `);
  });

  it("should rollup records with indexes", async () => {
    const table = new Table("test", validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const prevBlock = await dag.load<BlockData>(
      table.currentBlock.cache!.prevCID! as any
    );
    expect(prevBlock?.filters.indexes).toMatchSnapshot();
  });

  it("should rollup records with aggregates", async () => {
    const table = new Table("test", validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const prevBlock = await dag.load<BlockData>(
      table.currentBlock.cache!.prevCID! as any
    );
    expect(prevBlock?.filters.aggregates).toMatchInlineSnapshot(`
      {
        "count": 9,
      }
    `);
  });

  it("should rollup records with search", async () => {
    const table = new Table("test", validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const results = await table.search("test #3");
    expect(results).toMatchInlineSnapshot("[]");
  });

  it("should rewrite previous blocks to execute an update operation", async () => {
    const table = new Table("test", validDefinition, dag);
    for (let i = 0; i < 100; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    await table.update(2, { name: "test three", count: 1337 });

    const updated = await table.getById(2);
    expect(updated).toMatchInlineSnapshot(`
      {
        "count": 1337,
        "id": 2,
        "name": "test three",
      }
    `);

    expect(table.currentIndex).toBe(100);
  });

  describe("upsert", () => {
    it("should update inserted records", async () => {
      const table = new Table("test", validDefinition, dag);
      for (let i = 0; i < 11; i++) {
        await table.insert({ name: `test #${i}`, count: i });
      }
      const result = await table.getById(2);
      expect(result).toMatchObject({
        id: 2,
        name: "test #1",
        count: 1,
      });
      await table.upsert("id", result?.id, {
        name: "test three",
        count: 1337,
      });

      const updated = await table.getById(result?.id as number);
      expect(updated).toMatchObject({
        id: result?.id,
        name: "test three",
        count: 1337,
      });
    });

    it("should insert new records", async () => {
      const table = new Table("test", validDefinition, dag);
      for (let i = 0; i < 11; i++) {
        await table.upsert("name", `test #${i}`, { count: i });
      }
      const records = await table.query().select().execute();
      expect(records.all().length).toBe(11);
      const result = await table.getById(2);
      expect(result).toMatchObject({
        id: 2,
        name: "test #1",
        count: 1,
      });
    });
  });
});
