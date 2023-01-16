import { TestDIDDag } from "@candor/test-adapters";
import { createSeed, createDID } from "@candor/client";
import type { DID } from "dids";
import { describe, it, expect, beforeEach } from "vitest";
import { TableDefinition, Table, TableBlock } from "./table";

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
    expect(table.currentBlock).toMatchInlineSnapshot(`
      {
        "aggregates": {},
        "fromIndex": 0,
        "indexes": {},
        "prevCID": undefined,
        "records": {},
        "search": {
          "averageFieldLength": [],
          "dirtCount": 0,
          "documentCount": 0,
          "documentIds": {},
          "fieldIds": {
            "id": 1,
            "name": 0,
          },
          "fieldLength": {},
          "index": [],
          "nextId": 0,
          "serializationVersion": 2,
          "storedFields": {},
        },
        "toIndex": 10,
      }
    `);
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
    expect(table.currentBlock.indexes).toMatchInlineSnapshot(`
      {
        "id": {
          "0": [
            0,
          ],
        },
        "name": {
          "foo": [
            0,
          ],
        },
      }
    `);
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
    expect(prevBlock.indexes).toMatchInlineSnapshot(`
      {
        "id": {
          "0": [
            0,
          ],
          "1": [
            1,
          ],
          "2": [
            2,
          ],
          "3": [
            3,
          ],
          "4": [
            4,
          ],
          "5": [
            5,
          ],
          "6": [
            6,
          ],
          "7": [
            7,
          ],
          "8": [
            8,
          ],
          "9": [
            9,
          ],
        },
        "name": {
          "test #0": [
            0,
          ],
          "test #1": [
            1,
          ],
          "test #2": [
            2,
          ],
          "test #3": [
            3,
          ],
          "test #4": [
            4,
          ],
          "test #5": [
            5,
          ],
          "test #6": [
            6,
          ],
          "test #7": [
            7,
          ],
          "test #8": [
            8,
          ],
          "test #9": [
            9,
          ],
        },
      }
    `);
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

  it("should upsert records", async () => {
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
      await table.upsert("id", result.id, { name: "test three", count: 1337 });
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
});
