import { TestDIDDag } from "@cinderlink/test-adapters/src/dag";
import type { DID } from "dids";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Schema } from "./schema";
import { TableDefinition } from "@cinderlink/core-types";
import { createSeed, createDID } from "@cinderlink/identifiers";

const tableDefinition: TableDefinition<{
  id: number;
  uid: string;
  name: string;
  count: number;
}> = {
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

let did: DID;
let dag: TestDIDDag;

describe("@cinderlink/ipld-database/schema", () => {
  beforeAll(async () => {
    const seed = await createSeed("test seed");
    did = await createDID(seed);
  });

  beforeEach(async () => {
    dag = new TestDIDDag(did);
  });

  it("should create tables", async () => {
    const schema = new Schema("test", { test: tableDefinition }, dag, false);
    expect(schema.tables.test?.currentBlock).toMatchSnapshot();
  });

  it("should save and restore from dag", async () => {
    const schema = new Schema("test", { test: tableDefinition }, dag, false);
    for (let i = 0; i < 15; i++) {
      await schema.tables.test?.insert({ name: `test #${i}`, count: i });
    }
    const cid = await schema.save();
    const block = schema.tables.test.currentBlock.toJSON();
    expect(cid).not.toBeUndefined();
    expect(schema.tables.test).not.toBeUndefined();

    if (!cid) throw new Error("CID is undefined");
    const restored = await Schema.load(cid, dag);
    const restoredBlock = restored.tables.test.currentBlock.toJSON();
    expect(restoredBlock.records).toMatchObject(block.records);
    expect(restoredBlock.headers).toMatchObject(block.headers);
    expect(restoredBlock.filters.indexes).toMatchObject(block.filters.indexes);
    expect(restoredBlock.filters.aggregates).toMatchObject(
      block.filters.aggregates
    );
  });
});
