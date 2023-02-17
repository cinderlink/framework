import { rmSync } from "fs";
import { afterAll, beforeAll, bench, describe } from "vitest";
import { TableDefinition } from "@candor/core-types";
import { Schema } from "./../src/schema";
import { createSeed, createClient } from "../../client";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

const benchmarkSchema: Record<string, TableDefinition> = {
  test: {
    encrypted: false,
    indexes: {
      name: {
        unique: true,
        fields: ["name"],
      },
    },
    aggregate: {
      createdAt: "range",
    },
    searchOptions: {
      fields: ["id", "name"],
    },
    rollup: 1000,
    schemaId: "benchmark",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
      },
    },
  },
};

let iterator = 0;

let candor1, candor2;
let sqlite1, sqlite2;
beforeAll(async () => {
  await rmSync("./benchmark-1", { recursive: true, force: true });
  await rmSync("./benchmark-2", { recursive: true, force: true });

  const seed = await createSeed("benchmark-1");
  candor1 = await createClient(seed, [], {
    repo: "benchmark-1",
  });
  await candor1.start();
  const schema1 = new Schema("benchmark", benchmarkSchema, candor1.dag);
  await candor1.addSchema("benchmark", schema1);
  sqlite1 = await open({
    driver: sqlite3.Database,
    filename: "./benchmark-1/benchmark.db",
  });
  const seed2 = await createSeed("benchmark-2");
  candor2 = await createClient(seed2, [], {
    repo: "benchmark-2",
  });
  await candor2.start();
  const schema2 = new Schema("benchmark", benchmarkSchema, candor2.dag);
  await candor2.addSchema("benchmark", schema2);
  sqlite2 = await open({
    driver: sqlite3.Database,
    filename: "./benchmark-2/benchmark.db",
  });
  await (
    await sqlite1
  ).run(
    "CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
  );
  await (
    await sqlite2
  ).run(
    "CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
  );
  for (let i = 0; i < 10000; i++) {
    await (
      await sqlite2
    ).run("INSERT INTO test (name) VALUES (?)", `test-${i}`);
    await schema2.getTable("test")?.insert({
      name: `test-${i}`,
    });
  }
});

afterAll(async () => {
  await candor1?.stop();
  await sqlite1?.close();
  await candor2?.stop();
  await sqlite2?.close();
  await rmSync("./benchmark-1", { recursive: true, force: true });
  await rmSync("./benchmark-2", { recursive: true, force: true });
});

describe("inserting records", () => {
  bench(
    "@candor/client",
    async () => {
      await candor1
        .getSchema("benchmark")
        ?.getTable("test")
        ?.insert({
          name: `test-${iterator++}`,
        });
    },
    {
      iterations: 2000,
    }
  );
  bench("sqlite", async () => {
    await (
      await sqlite1
    ).run("INSERT INTO test (name) VALUES (?)", `test-${iterator++}`);
  });
});

describe("querying records", () => {
  bench("@candor/client", async () => {
    await candor2
      .getSchema("benchmark")
      ?.getTable("test")
      ?.query()
      .select()
      .where("name", "=", "test-1")
      .execute();
  });
  bench("sqlite", async () => {
    await (await sqlite2).get("SELECT * FROM test WHERE name = ?", "test-1");
  });
});
