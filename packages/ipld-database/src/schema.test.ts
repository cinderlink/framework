import { TestDIDDag } from "@cryptids/dag-interface";
import { number, object, string } from "superstruct";
import type { DID } from "dids";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Schema } from "./schema";
import { TableDefinition } from "./table";
import { createCryptidsSeed, createDID } from "@cryptids/client";

const tableDefinition: TableDefinition = {
  indexes: ["name", "id"],
  aggregate: {
    count: "max",
  },
  schema: object({
    name: string(),
    count: number(),
  }),
  searchOptions: {
    fields: ["name", "id"],
  },
  rollup: 10,
};

let did: DID;
let dag: TestDIDDag;

describe("@cryptids/ipld-database/schema", () => {
  beforeAll(async () => {
    const seed = await createCryptidsSeed("test seed");
    did = await createDID(seed);
  });

  beforeEach(async () => {
    dag = new TestDIDDag(did);
  });

  it("should create tables", async () => {
    const schema = new Schema("test", { test: tableDefinition }, dag);
    expect(schema.tables.test?.currentBlock).toMatchInlineSnapshot(`
      {
        "aggregates": {},
        "indexes": {},
        "prevCID": undefined,
        "rows": [],
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
      }
    `);
  });

  it("should save and restore from dag", async () => {
    const schema = new Schema("test", { test: tableDefinition }, dag);
    for (let i = 0; i < 15; i++) {
      await schema.tables.test?.insert({ name: `test #${i}`, count: i });
    }
    const cid = await schema.save();
    expect(cid).not.toBeUndefined();
    if (!cid) throw new Error("CID is undefined");
    const restored = await Schema.load(cid, dag);
    expect(restored.tables.test?.currentBlock.aggregates).toMatchObject(
      schema.tables.test?.currentBlock.aggregates
    );
    expect(restored.tables.test?.currentBlock.indexes).toMatchObject(
      schema.tables.test?.currentBlock.indexes
    );
    expect(restored.tables.test?.currentBlock.rows).toMatchObject(
      schema.tables.test?.currentBlock.rows
    );
  });
});
