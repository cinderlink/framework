import { TestDIDDag } from "@candor/test-adapters/src/dag";
import { createSeed, createDID } from "@candor/client";
import type { DID } from "dids";
import { describe, it, expect, beforeEach } from "vitest";
import { Table } from "./table";
import { TableBlock, TableDefinition } from "@candor/core-types";

const validDefinition: TableDefinition = {
  encrypted: false,
  indexes: ["name", "id"],
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
    const table = new Table(validDefinition, dag);
    expect(table.currentBlock).toMatchSnapshot();
  });

  it("should validate records", () => {
    const table = new Table(validDefinition, dag);
    expect(() => table.assertValid({ name: "foo", count: 1 })).not.toThrow();
    expect(() => table.assertValid({ name: "foo", count: "1" })).toThrow();
    expect(() => table.assertValid({ name: 1, count: 1 })).toThrow();
  });

  it("should insert records", async () => {
    const table = new Table(validDefinition, dag);
    await table.insert({ name: "foo", count: 1 });
    expect(Object.values(table.currentBlock.records).length).toBe(1);
  });

  it("should index records", async () => {
    const table = new Table(validDefinition, dag);
    await table.insert({ name: "foo", count: 1 });
    expect(table.currentBlock.indexes).toMatchSnapshot();
  });

  it("should search records", async () => {
    const table = new Table(validDefinition, dag);
    await table.insert({ name: "foo", count: 1 });
    const results = await table.search("foo");
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "count": 1,
          "id": 0,
          "name": "foo",
        },
      ]
    `);
  });

  it("should rollup records", async () => {
    const table = new Table(validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    expect(Object.values(table.currentBlock.records).length).toBe(1);
    expect(table.currentBlock.prevCID).not.toBeUndefined();
  });

  it("should aggregate records", async () => {
    const table = new Table(validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const prevBlock = await dag.load<TableBlock>(
      table.currentBlock.prevCID! as any
    );
    expect(prevBlock.aggregates).toMatchInlineSnapshot(`
      {
        "count": 9,
      }
    `);
  });

  it("should rollup records with indexes", async () => {
    const table = new Table(validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const prevBlock = await dag.load<TableBlock>(
      table.currentBlock.prevCID! as any
    );
    expect(prevBlock.indexes).toMatchSnapshot();
  });

  it("should rollup records with aggregates", async () => {
    const table = new Table(validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const prevBlock = await dag.load<TableBlock>(
      table.currentBlock.prevCID! as any
    );
    expect(prevBlock.aggregates).toMatchInlineSnapshot(`
      {
        "count": 9,
      }
    `);
  });

  it("should rollup records with search", async () => {
    const table = new Table(validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const results = await table.search("test #3");
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "count": 10,
          "id": 10,
          "name": "test #10",
        },
      ]
    `);
  });

  it("should allow finding by index", async () => {
    const table = new Table(validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const result = await table.findByIndex("name", "test #3");
    expect(result).toMatchInlineSnapshot(`
      {
        "count": 3,
        "id": 3,
        "name": "test #3",
      }
    `);
  });

  it("should rewrite previous blocks to execute an update operation", async () => {
    const table = new Table(validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const result = await table.findByIndex("name", "test #3");
    expect(result).toMatchInlineSnapshot(`
      {
        "count": 3,
        "id": 3,
        "name": "test #3",
      }
    `);
    if (result?.id) {
      await table.update(result.id, { name: "test three", count: 1337 });
    }

    const updated = await table.findByIndex("name", "test three");
    expect(updated).toMatchInlineSnapshot(`
      {
        "count": 1337,
        "id": 3,
        "name": "test three",
      }
    `);
  });

  describe("upsert", () => {
    it("should update inserted records", async () => {
      const table = new Table(validDefinition, dag);
      for (let i = 0; i < 11; i++) {
        await table.insert({ name: `test #${i}`, count: i });
      }
      expect(Object.values(table.currentBlock.records).length).toBe(1);
      const result = await table.findByIndex("name", "test #3");
      expect(result).toMatchObject({
        name: "test #3",
        count: 3,
      });
      if (result?.id) {
        await table.upsert("id", result.id, {
          name: "test three",
          count: 1337,
        });
      }

      const updated = await table.findByIndex("name", "test three");
      expect(updated).toMatchObject({
        name: "test three",
        count: 1337,
      });
    });

    it("should insert new records", async () => {
      const table = new Table(validDefinition, dag);
      for (let i = 0; i < 11; i++) {
        await table.upsert("name", `test #${i}`, { count: i });
      }
      expect(Object.values(table.currentBlock.records).length).toBe(1);
      const result = await table.findByIndex("name", "test #3");
      expect(result).toMatchObject({
        name: "test #3",
        count: 3,
      });
    });
  });
});
