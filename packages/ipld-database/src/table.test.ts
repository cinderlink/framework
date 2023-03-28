import * as ethers from "ethers";
import {
  createDID,
  signAddressVerification,
  createSeed,
} from "../../identifiers";
import { rmSync } from "fs";
import { createClient, CinderlinkClient } from "../../client";
import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import { Table } from "./table";
import { BlockData, TableDefinition, TableRow } from "../../core-types";

interface NonUniqueRow extends TableRow {
  id: number;
  uid: string;
  did: string;
  update: string;
  updatedAt: number;
  createdAt: number;
}

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
      did.id,
      wallet
    );
    client = (await createClient({
      address,
      addressVerification,
      did,
      role: "peer",
      options: {
        repo: "test-data/" + tst.meta.name,
      },
    })) as CinderlinkClient;
    client.initialConnectTimeout = 1;
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
    const uid = await table.insert({ name: "foo", count: 1 });
    expect(Object.values(table.currentBlock.cache?.records || {}).length).toBe(
      1
    );
    expect(uid).toMatchInlineSnapshot(
      '"bagaaieralxfilz3jrhsv5o66zhstasbsybvj5llrhcyeg4wgkvjqaph5fbeq"'
    );
    const results = await table
      .query()
      .select()
      .where("uid", "=", uid)
      .execute();
    expect(results).toMatchInlineSnapshot(`
      TableQueryResult {
        "rows": [
          {
            "count": 1,
            "id": 1,
            "name": "foo",
            "uid": "bagaaieralxfilz3jrhsv5o66zhstasbsybvj5llrhcyeg4wgkvjqaph5fbeq",
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
        "uid": "bagaaieralxfilz3jrhsv5o66zhstasbsybvj5llrhcyeg4wgkvjqaph5fbeq",
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
          "uid": "bagaaieralxfilz3jrhsv5o66zhstasbsybvj5llrhcyeg4wgkvjqaph5fbeq",
        },
      ]
    `);
  });

  it("should rollup records", async () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    expect(table.currentIndex).toBe(11);
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
          "uid": "bagaaiera5cclqznug4jgdkche2c2xtzdrr4vg6ytx266smmnwpiamzdcv4va",
        },
      ]
    `);
  });

  it("should rewrite previous blocks to update", async () => {
    const table = new Table<TestRow>("test", validDefinition, client.dag);
    const uids: string[] = [];
    for (let i = 1; i < 11; i++) {
      uids.push(await table.insert({ name: `test #${i}`, count: i }));
    }
    await table.update(uids[2], { name: "test three", count: 1337 });

    const allRecords = await table
      .query()
      .select()
      .execute()
      .then((r) => r.all());
    expect(allRecords).toHaveLength(10);

    const updated = await table.getByUid(uids[2]);
    expect(updated).toMatchInlineSnapshot(`
      {
        "count": 1337,
        "id": 3,
        "name": "test three",
        "uid": "bagaaierabxgwcvvlt2sqgrxwqoxhlkqphc5g5o3rwnkqbyw4bxh5txk3lmiq",
      }
    `);

    expect(table.currentIndex).toBe(11);
  }, 30000);

  describe("upsert", () => {
    it("should update inserted records", async () => {
      const table = new Table<TestRow>("test", validDefinition, client.dag);
      for (let i = 1; i < 11; i++) {
        await table.insert({ name: `test #${i}`, count: i });
      }

      const result = await table.getById(1);
      expect(result).toMatchObject({
        id: 1,
        name: "test #1",
        count: 1,
      });
      await table.upsert(
        { id: 1 },
        {
          name: "test three",
          count: 1337,
        }
      );

      const updated = await table.getById(result?.id as number);
      expect(updated).toMatchObject({
        id: 1,
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
          "uid": "bagaaieradbrlgbyiagiu4zzfadvwxskwm5vi3r3ucg56d5bgcj7xl5khnifa",
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
          "uid": "bagaaieradbrlgbyiagiu4zzfadvwxskwm5vi3r3ucg56d5bgcj7xl5khnifa",
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
      expect(inserted).toMatchInlineSnapshot(
        '"bagaaieradbrlgbyiagiu4zzfadvwxskwm5vi3r3ucg56d5bgcj7xl5khnifa"'
      );

      const upserted = await users.upsert({ did: "foo:bar" }, { name: "baz" });
      expect(upserted).toMatchInlineSnapshot(`
        {
          "did": "foo:bar",
          "id": 1,
          "name": "baz",
          "uid": "bagaaieradbrlgbyiagiu4zzfadvwxskwm5vi3r3ucg56d5bgcj7xl5khnifa",
          "updatedAt": 0,
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
          "uid": "bagaaieradbrlgbyiagiu4zzfadvwxskwm5vi3r3ucg56d5bgcj7xl5khnifa",
          "updatedAt": 0,
        }
      `);

      expect(upserted).toMatchObject(selected);
      expect(upserted).not.toMatchObject(inserted);
    });

    it("should create distinct unique identifiers for records with unique indexes", async () => {
      const users = new Table<UsersRow>("users", usersDef, client.dag);
      const inserted = await users.insert({
        did: "foo:bar",
        name: "bar",
        updatedAt: 0,
      });

      const computed = await users.computeUid({
        did: "foo:bar",
        name: "baz",
        updatedAt: 123,
      });
      expect(computed).toMatch(inserted);
    });

    it("should create deterministic identifiers for records without unique indexes", async () => {
      const nonUniqueDef: TableDefinition<NonUniqueRow> = {
        schemaId: "test",
        aggregate: {},
        indexes: {},
        searchOptions: {
          fields: ["did", "update"],
        },
        schema: {
          type: "object",
          properties: {
            id: { type: "number" },
            uid: { type: "string" },
            did: { type: "string" },
            update: { type: "string" },
            updatedAt: { type: "number" },
            createdAt: { type: "number" },
          },
        },
        encrypted: false,
        rollup: 1000,
      };
      const nonUnique = new Table<NonUniqueRow>(
        "nonUnique",
        nonUniqueDef,
        client.dag
      );
      const recordA = {
        did: "foo:bar",
        update: "bar",
        updatedAt: 0,
        createdAt: 0,
      };
      const recordB = {
        did: "foo:bar",
        update: "baz",
        updatedAt: 123,
        createdAt: 123,
      };
      const insertedA = await nonUnique.insert(recordA);
      const computedA = await nonUnique.computeUid(recordA);
      expect(computedA).toMatch(insertedA);
      const insertedB = await nonUnique.insert(recordB);
      const computedB = await nonUnique.computeUid(recordB);
      expect(computedB).toMatch(insertedB);
      expect(computedA).not.toMatch(computedB);
    });
  });
});
