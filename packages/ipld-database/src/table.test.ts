import { ethers } from "ethers";
import {
  createDID,
  signAddressVerification,
  createSeed,
} from "@cinderlink/identifiers";
import { rmSync } from "fs";
import { createClient, CinderlinkClient } from "../../client";
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { Table } from "./table";
import { BlockData, TableDefinition, TableRow } from "@cinderlink/core-types";

interface UsersRow extends TableRow {
  id: number;
  name: string;
  bio?: string;
  avatar?: string;
  did?: string;
  status?: string;
  updatedAt: number;
}

export const usersDef = {
  schemaId: "social",
  encrypted: false,
  aggregate: {},
  indexes: {
    did: {
      unique: true,
      fields: ["did"],
    },
  },
  rollup: 1000,
  searchOptions: {
    fields: ["id", "name", "did"],
  },
  schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      bio: { type: "string" },
      avatar: { type: "string" },
      did: { type: "string" },
      status: { type: "string" },
      updatedAt: { type: "number" },
    },
  },
} as TableDefinition<UsersRow>;

interface TestRow extends TableRow {
  id: number;
  name: string;
  count: number;
}

const validDefinition: TableDefinition<TestRow> = {
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

let client: CinderlinkClient;
describe("@cinderlink/ipld-database/table", () => {
  beforeEach(async (tst) => {
    const seed = await createSeed("test seed");
    const did = await createDID(seed);
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;
    const addressVerification = await signAddressVerification(
      "test",
      did,
      wallet
    );
    client = (await createClient({
      address,
      addressVerification,
      did,
      options: {
        repo: "test-data/" + tst.meta.name,
      },
    })) as CinderlinkClient;
    await client.start();
  });

  afterEach(async () => {
    await client.stop();
  });

  afterAll(() => {
    rmSync("./test-data", { recursive: true, force: true });
  });

  it("should create a current block", () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    expect(table.currentBlock).toMatchSnapshot();
  });

  it("should validate records", () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    expect(() => table.assertValid({ name: "foo", count: 1 })).not.toThrow();
    // @ts-ignore
    expect(() => table.assertValid({ name: "foo", count: "1" })).toThrow();
    // @ts-ignore
    expect(() => table.assertValid({ name: 1, count: 1 })).toThrow();
  });

  it("should insert records", async () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
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
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    await table.insert({ name: "foo", count: 1 });
    expect(table.currentBlock.cache?.filters?.indexes).toMatchSnapshot();
  });

  it("should search records", async () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    await table.insert({ name: "foo", count: 1 });
    await table.insert({ name: "bar", count: 1 });
    await table.insert({ name: "baz", count: 1 });
    const results = await table.search("foo");
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "count": 1,
          "id": 1,
          "name": "foo",
        },
      ]
    `);
  });

  it("should rollup records", async () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    for (let i = 0; i < 1000; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    expect(table.currentIndex).toBe(1000);
    expect(table.currentBlock.cache?.prevCID).not.toBeUndefined();
  });

  it("should aggregate records", async () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const prevBlock = await client.dag.load<BlockData>(
      table.currentBlock.cache!.prevCID! as any
    );
    expect(prevBlock?.filters.aggregates).toMatchInlineSnapshot(`
      {
        "count": 9,
      }
    `);
  });

  it("should rollup records with indexes", async () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const prevBlock = await client.dag.load<BlockData>(
      table.currentBlock.cache!.prevCID! as any
    );
    expect(prevBlock?.filters.indexes).toMatchSnapshot();
  });

  it("should rollup records with aggregates", async () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const prevBlock = await client.dag.load<BlockData>(
      table.currentBlock.cache!.prevCID! as any
    );
    expect(prevBlock?.filters.aggregates).toMatchInlineSnapshot(`
      {
        "count": 9,
      }
    `);
  });

  it("should rollup records with search", async () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    const results = await table.search("test #3");
    expect(results).toMatchInlineSnapshot(`
      [
        {
          "count": 10,
          "id": 11,
          "name": "test #10",
        },
      ]
    `);
  });

  it("should rewrite previous blocks to update", async () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    for (let i = 0; i < 100; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    await table.update(2, { name: "test three", count: 1337 });

    const allRecords = await table
      .query()
      .select()
      .execute()
      .then((r) => r.all());
    expect(allRecords).toHaveLength(100);

    const updated = await table.getById(2);
    expect(updated).toMatchInlineSnapshot(`
      {
        "count": 1337,
        "id": 2,
        "name": "test three",
      }
    `);

    expect(table.currentIndex).toBe(101);
  }, 30000);

  describe("upsert", () => {
    it("should update inserted records", async () => {
      const table = new Table<TestRow>("test", validDefinition, client.dag);
      for (let i = 0; i < 11; i++) {
        await table.insert({ name: `test #${i}`, count: i });
      }

      const result = await table.getById(2);
      expect(result).toMatchObject({
        id: 2,
        name: "test #1",
        count: 1,
      });
      await table.upsert(
        { id: result?.id },
        {
          name: "test three",
          count: 1337,
        }
      );

      const updated = await table.getById(result?.id as number);
      expect(updated).toMatchObject({
        id: result?.id,
        name: "test three",
        count: 1337,
      });
    });

    it("should insert new records", async () => {
      const table = new Table<TestRow>("test", validDefinition, client.dag);
      for (let i = 0; i < 11; i++) {
        await table.upsert({ name: `test #${i}` }, { count: i });
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

    it("should insert records with unique indexes", async () => {
      const users = new Table<UsersRow>("users", usersDef, client.dag);
      const returned = await users.upsert({ did: "foo:bar" }, { name: "bar" });
      expect(returned).toMatchInlineSnapshot(`
        {
          "did": "foo:bar",
          "id": 1,
          "name": "bar",
        }
      `);
      const selected = await users
        .query()
        .select()
        .where("did", "=", "foo:bar")
        .execute()
        .then((r) => r.first());
      expect(selected).toMatchInlineSnapshot(`
        {
          "did": "foo:bar",
          "id": 1,
          "name": "bar",
        }
      `);
      expect(returned).toMatchObject(selected);
    });

    it("should update records with unique indexes", async () => {
      const users = new Table<UsersRow>("users", usersDef, client.dag);
      const inserted = await users.insert({
        did: "foo:bar",
        name: "bar",
        updatedAt: 0,
      });
      expect(inserted).toMatchInlineSnapshot("1");

      const upserted = await users.upsert({ did: "foo:bar" }, { name: "baz" });
      expect(upserted).toMatchInlineSnapshot(`
        {
          "did": "foo:bar",
          "id": 1,
          "name": "baz",
        }
      `);

      const selected = await users
        .query()
        .select()
        .where("did", "=", "foo:bar")
        .execute()
        .then((r) => r.first());
      expect(selected).toMatchInlineSnapshot(`
        {
          "did": "foo:bar",
          "id": 1,
          "name": "baz",
        }
      `);

      expect(upserted).toMatchObject(selected);
      expect(upserted).not.toMatchObject(inserted);
    });
  });
});
