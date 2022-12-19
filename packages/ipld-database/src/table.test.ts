import { TestDIDDag } from "@cryptids/dag-interface";
import { createCryptidsSeed, createDID } from "@cryptids/client";
import type { DID } from "dids";
import { number, object, string } from "superstruct";
import { describe, it, expect, beforeEach } from "vitest";
import { TableDefinition, Table, TableBlock } from "./table";

const validDefinition: TableDefinition = {
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

let seed: Uint8Array;
let dag: TestDIDDag;
let did: DID;
describe("@ipld-database/table", () => {
  beforeEach(async () => {
    seed = await createCryptidsSeed("test seed");
    did = await createDID(seed);
    dag = new TestDIDDag(did);
  });

  it("should create a current block", () => {
    const table = new Table(validDefinition, dag);
    expect(table.currentBlock).toMatchInlineSnapshot(`
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

  it("should validate records", () => {
    const table = new Table(validDefinition, dag);
    expect(() => table.assertValid({ name: "foo", count: 1 })).not.toThrow();
    expect(() => table.assertValid({ name: "foo", count: "1" })).toThrow();
    expect(() => table.assertValid({ name: 1, count: 1 })).toThrow();
  });

  it("should insert records", async () => {
    const table = new Table(validDefinition, dag);
    await table.insert({ name: "foo", count: 1 });
    expect(table.currentBlock.rows.length).toBe(1);
  });

  it("should index records", async () => {
    const table = new Table(validDefinition, dag);
    await table.insert({ name: "foo", count: 1 });
    expect(table.currentBlock.indexes).toMatchInlineSnapshot(`
      {
        "id": {
          "bagaaiera56hpvdlw4yxtgt5ld3khq42l7tz2ejqjrmnnrxccvpuztg34762a": [
            "bagaaiera56hpvdlw4yxtgt5ld3khq42l7tz2ejqjrmnnrxccvpuztg34762a",
          ],
        },
        "name": {
          "foo": [
            "bagaaiera56hpvdlw4yxtgt5ld3khq42l7tz2ejqjrmnnrxccvpuztg34762a",
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
          "id": "bagaaiera56hpvdlw4yxtgt5ld3khq42l7tz2ejqjrmnnrxccvpuztg34762a",
          "match": {
            "foo": [
              "name",
            ],
          },
          "score": 0.4315231086776713,
          "terms": [
            "foo",
          ],
        },
        {
          "id": "bagaaiera56hpvdlw4yxtgt5ld3khq42l7tz2ejqjrmnnrxccvpuztg34762a",
          "match": {
            "foo": [
              "name",
            ],
          },
          "score": 0.4315231086776713,
          "terms": [
            "foo",
          ],
        },
      ]
    `);
  });

  it("should rollup records", async () => {
    const table = new Table(validDefinition, dag);
    for (let i = 0; i < 11; i++) {
      await table.insert({ name: `test #${i}`, count: i });
    }
    expect(table.currentBlock.rows.length).toBe(1);
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
          "bagaaiera2nem4drd6zrus2m2ybmiotvwhtzqtp447nofh4zrcst7hx6uyowq": [
            "bagaaiera2nem4drd6zrus2m2ybmiotvwhtzqtp447nofh4zrcst7hx6uyowq",
          ],
          "bagaaiera5vbpo3bzt5howcvkrqhept5usdkwxesu2pbqkwonsfplkt54nqjq": [
            "bagaaiera5vbpo3bzt5howcvkrqhept5usdkwxesu2pbqkwonsfplkt54nqjq",
          ],
          "bagaaiera7iwbjpsa2othzm2jb57j35uarx7sl3msqvph2x3ljz45mno62dja": [
            "bagaaiera7iwbjpsa2othzm2jb57j35uarx7sl3msqvph2x3ljz45mno62dja",
          ],
          "bagaaierabknev2itqla37ldh52uhf62drbh6oqkkj73y4utn7sd56gfwavqa": [
            "bagaaierabknev2itqla37ldh52uhf62drbh6oqkkj73y4utn7sd56gfwavqa",
          ],
          "bagaaieracbljfcnnfnhigxwsskz5hulujm54rhqjnjusnb66v2xcxsb3igva": [
            "bagaaieracbljfcnnfnhigxwsskz5hulujm54rhqjnjusnb66v2xcxsb3igva",
          ],
          "bagaaierafr3lzqnmxsxgpsvvacsvr2ii7hmzust44dhba25loc2xpqbo2ima": [
            "bagaaierafr3lzqnmxsxgpsvvacsvr2ii7hmzust44dhba25loc2xpqbo2ima",
          ],
          "bagaaierafxnlovfwm5oieru7nksmraadslns36mtkjcoxhox3l2rwxqj7tpq": [
            "bagaaierafxnlovfwm5oieru7nksmraadslns36mtkjcoxhox3l2rwxqj7tpq",
          ],
          "bagaaierajhb4rpktu2xyajjxwzre3ohgs2lifvsy3jqzyz3m4nvuptozejgq": [
            "bagaaierajhb4rpktu2xyajjxwzre3ohgs2lifvsy3jqzyz3m4nvuptozejgq",
          ],
          "bagaaierajr7muh6w6r7fohpfxfortahlgehjpccukajhyov5he3taxsum5dq": [
            "bagaaierajr7muh6w6r7fohpfxfortahlgehjpccukajhyov5he3taxsum5dq",
          ],
          "bagaaierawvqlwvvm4lozaegudl57zgjpvesfd5rpot5onpgsy7bh3rorvy5a": [
            "bagaaierawvqlwvvm4lozaegudl57zgjpvesfd5rpot5onpgsy7bh3rorvy5a",
          ],
        },
        "name": {
          "test #0": [
            "bagaaieracbljfcnnfnhigxwsskz5hulujm54rhqjnjusnb66v2xcxsb3igva",
          ],
          "test #1": [
            "bagaaierajhb4rpktu2xyajjxwzre3ohgs2lifvsy3jqzyz3m4nvuptozejgq",
          ],
          "test #2": [
            "bagaaierabknev2itqla37ldh52uhf62drbh6oqkkj73y4utn7sd56gfwavqa",
          ],
          "test #3": [
            "bagaaiera7iwbjpsa2othzm2jb57j35uarx7sl3msqvph2x3ljz45mno62dja",
          ],
          "test #4": [
            "bagaaiera5vbpo3bzt5howcvkrqhept5usdkwxesu2pbqkwonsfplkt54nqjq",
          ],
          "test #5": [
            "bagaaiera2nem4drd6zrus2m2ybmiotvwhtzqtp447nofh4zrcst7hx6uyowq",
          ],
          "test #6": [
            "bagaaierawvqlwvvm4lozaegudl57zgjpvesfd5rpot5onpgsy7bh3rorvy5a",
          ],
          "test #7": [
            "bagaaierajr7muh6w6r7fohpfxfortahlgehjpccukajhyov5he3taxsum5dq",
          ],
          "test #8": [
            "bagaaierafxnlovfwm5oieru7nksmraadslns36mtkjcoxhox3l2rwxqj7tpq",
          ],
          "test #9": [
            "bagaaierafr3lzqnmxsxgpsvvacsvr2ii7hmzust44dhba25loc2xpqbo2ima",
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
          "id": "bagaaiera4gansrre3n3wwqampgxrl2xsjhnpyhkwhtypwn3wq6q4fdrrynja",
          "match": {
            "test": [
              "name",
            ],
          },
          "score": 0.4315231086776713,
          "terms": [
            "test",
          ],
        },
        {
          "id": "bagaaiera4gansrre3n3wwqampgxrl2xsjhnpyhkwhtypwn3wq6q4fdrrynja",
          "match": {
            "test": [
              "name",
            ],
          },
          "score": 0.4315231086776713,
          "terms": [
            "test",
          ],
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
        "id": "bagaaiera7iwbjpsa2othzm2jb57j35uarx7sl3msqvph2x3ljz45mno62dja",
        "name": "test #3",
      }
    `);
  });
});
