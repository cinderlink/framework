import { TestDIDDag } from "@candor/test-adapters/src/dag";
import type { DID } from "dids";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Schema } from "./schema";
import { TableDefinition } from "@candor/core-types";
import { createSeed, createDID } from "@candor/client";

const tableDefinition: TableDefinition = {
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

let did: DID;
let dag: TestDIDDag;

describe("@candor/ipld-database/schema", () => {
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
    expect(cid).not.toBeUndefined();
    expect(schema.tables.test).toMatchSnapshot();

    if (!cid) throw new Error("CID is undefined");
    const restored = await Schema.load(cid, dag, false);
    expect(restored.tables.test.currentIndex).toMatchObject(
      schema.tables.test.currentIndex
    );
  });
});
