import { TestDIDDag } from "../../test-adapters/dist/index.mjs";
import { createDID } from "../../client/dist/did/create.js";
import { createSeed } from "../../client/dist/hash.js";
import { Table } from "../dist/index.js";

const tableDef = {
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

console.info("creating table...");
const seed = await createSeed("test seed");
const did = await createDID(seed);
const dag = new TestDIDDag(did);
const table = new Table("test", tableDef, dag);

for (let i = 0; i < 100; i++) {
  console.info(`inserting record #${i}...`);
  await table.insert({
    name: `test ${i}`,
    count: i,
  });
}

console.info("querying...");
const test1 = (
  await table.query().where("name", "=", "test 1").execute()
).first();
console.log(test1);
