import { TestDIDDag } from "@cryptids/dag-interface";
import type { DID } from "dids";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Schema } from "./schema";
import { TableDefinition } from "./table";
import { createCryptidsSeed, createDID } from "@cryptids/client";

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

describe("@cryptids/ipld-database/schema", () => {
  beforeAll(async () => {
    const seed = await createCryptidsSeed("test seed");
    did = await createDID(seed);
  });

  beforeEach(async () => {
    dag = new TestDIDDag(did);
  });

  it("should create tables", async () => {
    const schema = new Schema("test", { test: tableDefinition }, dag, false);
    expect(schema.tables.test?.currentBlock).toMatchInlineSnapshot(`
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

  it("should save and restore from dag", async () => {
    const schema = new Schema("test", { test: tableDefinition }, dag, false);
    for (let i = 0; i < 15; i++) {
      await schema.tables.test?.insert({ name: `test #${i}`, count: i });
    }
    const cid = await schema.save();
    expect(cid).not.toBeUndefined();
    expect(schema.tables.test).toMatchInlineSnapshot(`
      Table {
        "currentBlock": {
          "aggregates": {},
          "fromIndex": 15,
          "indexes": {},
          "prevCID": "bagaaierahuzg2to24eonl7fyk7tlzepjmglzhzndbm4mwrotoski46amchja",
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
          "toIndex": 25,
        },
        "currentIndex": 15,
        "dag": TestDIDDag {
          "dag": TestDag {
            "cache": {
              "bagaaiera2nem4drd6zrus2m2ybmiotvwhtzqtp447nofh4zrcst7hx6uyowq": {
                "count": 5,
                "id": 5,
                "name": "test #5",
              },
              "bagaaiera4gansrre3n3wwqampgxrl2xsjhnpyhkwhtypwn3wq6q4fdrrynja": {
                "count": 10,
                "id": 10,
                "name": "test #10",
              },
              "bagaaiera5vbpo3bzt5howcvkrqhept5usdkwxesu2pbqkwonsfplkt54nqjq": {
                "count": 4,
                "id": 4,
                "name": "test #4",
              },
              "bagaaiera7iwbjpsa2othzm2jb57j35uarx7sl3msqvph2x3ljz45mno62dja": {
                "count": 3,
                "id": 3,
                "name": "test #3",
              },
              "bagaaierabknev2itqla37ldh52uhf62drbh6oqkkj73y4utn7sd56gfwavqa": {
                "count": 2,
                "id": 2,
                "name": "test #2",
              },
              "bagaaieracbljfcnnfnhigxwsskz5hulujm54rhqjnjusnb66v2xcxsb3igva": {
                "count": 0,
                "id": 0,
                "name": "test #0",
              },
              "bagaaierafr3lzqnmxsxgpsvvacsvr2ii7hmzust44dhba25loc2xpqbo2ima": {
                "count": 9,
                "id": 9,
                "name": "test #9",
              },
              "bagaaierafxnlovfwm5oieru7nksmraadslns36mtkjcoxhox3l2rwxqj7tpq": {
                "count": 8,
                "id": 8,
                "name": "test #8",
              },
              "bagaaieragji6hwjqxhl33ptj32r6hgogisewrbwz2l62vdbzydikuxrzohsq": {
                "count": 14,
                "id": 14,
                "name": "test #14",
              },
              "bagaaierahuzg2to24eonl7fyk7tlzepjmglzhzndbm4mwrotoski46amchja": {
                "aggregates": {
                  "count": 14,
                },
                "fromIndex": 10,
                "index": {
                  "averageFieldLength": [
                    2,
                    1,
                  ],
                  "dirtCount": 0,
                  "documentCount": 5,
                  "documentIds": {
                    "0": 10,
                    "1": 11,
                    "2": 12,
                    "3": 13,
                    "4": 14,
                  },
                  "fieldIds": {
                    "id": 1,
                    "name": 0,
                  },
                  "fieldLength": {
                    "0": [
                      2,
                      1,
                    ],
                    "1": [
                      2,
                      1,
                    ],
                    "2": [
                      2,
                      1,
                    ],
                    "3": [
                      2,
                      1,
                    ],
                    "4": [
                      2,
                      1,
                    ],
                  },
                  "index": [
                    [
                      "14",
                      {
                        "0": {
                          "4": 1,
                        },
                        "1": {
                          "4": 1,
                        },
                      },
                    ],
                    [
                      "13",
                      {
                        "0": {
                          "3": 1,
                        },
                        "1": {
                          "3": 1,
                        },
                      },
                    ],
                    [
                      "12",
                      {
                        "0": {
                          "2": 1,
                        },
                        "1": {
                          "2": 1,
                        },
                      },
                    ],
                    [
                      "11",
                      {
                        "0": {
                          "1": 1,
                        },
                        "1": {
                          "1": 1,
                        },
                      },
                    ],
                    [
                      "10",
                      {
                        "0": {
                          "0": 1,
                        },
                        "1": {
                          "0": 1,
                        },
                      },
                    ],
                    [
                      "test",
                      {
                        "0": {
                          "0": 1,
                          "1": 1,
                          "2": 1,
                          "3": 1,
                          "4": 1,
                        },
                      },
                    ],
                  ],
                  "nextId": 5,
                  "serializationVersion": 2,
                  "storedFields": {},
                },
                "indexes": {
                  "id": {
                    "10": [
                      10,
                    ],
                    "11": [
                      11,
                    ],
                    "12": [
                      12,
                    ],
                    "13": [
                      13,
                    ],
                    "14": [
                      14,
                    ],
                  },
                  "name": {
                    "test #10": [
                      10,
                    ],
                    "test #11": [
                      11,
                    ],
                    "test #12": [
                      12,
                    ],
                    "test #13": [
                      13,
                    ],
                    "test #14": [
                      14,
                    ],
                  },
                },
                "prevCID": "bagaaierauif46tcptoyhstgms25kc4ooxlxaspsigjv7i5u2lzffajskcndq",
                "records": {
                  "10": {
                    "count": 10,
                    "id": 10,
                    "name": "test #10",
                  },
                  "11": {
                    "count": 11,
                    "id": 11,
                    "name": "test #11",
                  },
                  "12": {
                    "count": 12,
                    "id": 12,
                    "name": "test #12",
                  },
                  "13": {
                    "count": 13,
                    "id": 13,
                    "name": "test #13",
                  },
                  "14": {
                    "count": 14,
                    "id": 14,
                    "name": "test #14",
                  },
                },
                "toIndex": 15,
              },
              "bagaaierai5gmw5jlhcdpyqqeenrphlkjodr65l43gsnrmozrudmpz3sgc3ha": {
                "count": 13,
                "id": 13,
                "name": "test #13",
              },
              "bagaaieraizqbgmbozttjm7sfnc2etbbhpn43wknqrjc2kfb7zqcxzalvio7a": {
                "defs": {
                  "test": {
                    "aggregate": {
                      "count": "max",
                    },
                    "encrypted": false,
                    "indexes": [
                      "name",
                      "id",
                    ],
                    "rollup": 10,
                    "schema": {
                      "properties": {
                        "count": {
                          "type": "number",
                        },
                        "name": {
                          "type": "string",
                        },
                      },
                      "type": "object",
                    },
                    "searchOptions": {
                      "fields": [
                        "name",
                        "id",
                      ],
                    },
                  },
                },
                "name": "test",
                "tables": {
                  "test": "bagaaierahuzg2to24eonl7fyk7tlzepjmglzhzndbm4mwrotoski46amchja",
                },
              },
              "bagaaierajhb4rpktu2xyajjxwzre3ohgs2lifvsy3jqzyz3m4nvuptozejgq": {
                "count": 1,
                "id": 1,
                "name": "test #1",
              },
              "bagaaierajr7muh6w6r7fohpfxfortahlgehjpccukajhyov5he3taxsum5dq": {
                "count": 7,
                "id": 7,
                "name": "test #7",
              },
              "bagaaieraljqbkef3q7n4sfhhizj56np5jaka6uuuqsphtd7rvsnbbfvvt4sq": {
                "count": 12,
                "id": 12,
                "name": "test #12",
              },
              "bagaaieraueczmp4ddfk4sgcpbg5272u5iokelrxyts3qdkb44olzf7osiqya": {
                "count": 11,
                "id": 11,
                "name": "test #11",
              },
              "bagaaierauif46tcptoyhstgms25kc4ooxlxaspsigjv7i5u2lzffajskcndq": {
                "aggregates": {
                  "count": 9,
                },
                "fromIndex": 0,
                "index": {
                  "averageFieldLength": [
                    2,
                    1,
                  ],
                  "dirtCount": 0,
                  "documentCount": 10,
                  "documentIds": {
                    "0": 0,
                    "1": 1,
                    "2": 2,
                    "3": 3,
                    "4": 4,
                    "5": 5,
                    "6": 6,
                    "7": 7,
                    "8": 8,
                    "9": 9,
                  },
                  "fieldIds": {
                    "id": 1,
                    "name": 0,
                  },
                  "fieldLength": {
                    "0": [
                      2,
                      1,
                    ],
                    "1": [
                      2,
                      1,
                    ],
                    "2": [
                      2,
                      1,
                    ],
                    "3": [
                      2,
                      1,
                    ],
                    "4": [
                      2,
                      1,
                    ],
                    "5": [
                      2,
                      1,
                    ],
                    "6": [
                      2,
                      1,
                    ],
                    "7": [
                      2,
                      1,
                    ],
                    "8": [
                      2,
                      1,
                    ],
                    "9": [
                      2,
                      1,
                    ],
                  },
                  "index": [
                    [
                      "9",
                      {
                        "0": {
                          "9": 1,
                        },
                        "1": {
                          "9": 1,
                        },
                      },
                    ],
                    [
                      "8",
                      {
                        "0": {
                          "8": 1,
                        },
                        "1": {
                          "8": 1,
                        },
                      },
                    ],
                    [
                      "7",
                      {
                        "0": {
                          "7": 1,
                        },
                        "1": {
                          "7": 1,
                        },
                      },
                    ],
                    [
                      "6",
                      {
                        "0": {
                          "6": 1,
                        },
                        "1": {
                          "6": 1,
                        },
                      },
                    ],
                    [
                      "5",
                      {
                        "0": {
                          "5": 1,
                        },
                        "1": {
                          "5": 1,
                        },
                      },
                    ],
                    [
                      "4",
                      {
                        "0": {
                          "4": 1,
                        },
                        "1": {
                          "4": 1,
                        },
                      },
                    ],
                    [
                      "3",
                      {
                        "0": {
                          "3": 1,
                        },
                        "1": {
                          "3": 1,
                        },
                      },
                    ],
                    [
                      "2",
                      {
                        "0": {
                          "2": 1,
                        },
                        "1": {
                          "2": 1,
                        },
                      },
                    ],
                    [
                      "1",
                      {
                        "0": {
                          "1": 1,
                        },
                        "1": {
                          "1": 1,
                        },
                      },
                    ],
                    [
                      "0",
                      {
                        "0": {
                          "0": 1,
                        },
                        "1": {
                          "0": 1,
                        },
                      },
                    ],
                    [
                      "test",
                      {
                        "0": {
                          "0": 1,
                          "1": 1,
                          "2": 1,
                          "3": 1,
                          "4": 1,
                          "5": 1,
                          "6": 1,
                          "7": 1,
                          "8": 1,
                          "9": 1,
                        },
                      },
                    ],
                  ],
                  "nextId": 10,
                  "serializationVersion": 2,
                  "storedFields": {},
                },
                "indexes": {
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
                },
                "records": {
                  "0": {
                    "count": 0,
                    "id": 0,
                    "name": "test #0",
                  },
                  "1": {
                    "count": 1,
                    "id": 1,
                    "name": "test #1",
                  },
                  "2": {
                    "count": 2,
                    "id": 2,
                    "name": "test #2",
                  },
                  "3": {
                    "count": 3,
                    "id": 3,
                    "name": "test #3",
                  },
                  "4": {
                    "count": 4,
                    "id": 4,
                    "name": "test #4",
                  },
                  "5": {
                    "count": 5,
                    "id": 5,
                    "name": "test #5",
                  },
                  "6": {
                    "count": 6,
                    "id": 6,
                    "name": "test #6",
                  },
                  "7": {
                    "count": 7,
                    "id": 7,
                    "name": "test #7",
                  },
                  "8": {
                    "count": 8,
                    "id": 8,
                    "name": "test #8",
                  },
                  "9": {
                    "count": 9,
                    "id": 9,
                    "name": "test #9",
                  },
                },
                "toIndex": 10,
              },
              "bagaaierawvqlwvvm4lozaegudl57zgjpvesfd5rpot5onpgsy7bh3rorvy5a": {
                "count": 6,
                "id": 6,
                "name": "test #6",
              },
            },
          },
          "did": DID {
            "_client": RPCClient {},
            "_id": "did:key:z6MksZ6DQgtWJXeJR9qtbWuYTQiNMBczMyrXNvWtDN2wuoJm",
            "_resolver": Resolver {
              "cache": [Function],
              "registry": {
                "key": [Function],
              },
            },
          },
        },
        "debug": {
          "enabled": false,
          "logger": [Function],
        },
        "def": {
          "aggregate": {
            "count": "max",
          },
          "encrypted": false,
          "indexes": [
            "name",
            "id",
          ],
          "rollup": 10,
          "schema": {
            "properties": {
              "count": {
                "type": "number",
              },
              "name": {
                "type": "string",
              },
            },
            "type": "object",
          },
          "searchOptions": {
            "fields": [
              "name",
              "id",
            ],
          },
        },
        "encrypted": false,
      }
    `);

    if (!cid) throw new Error("CID is undefined");
    const restored = await Schema.load(cid, dag, false);
    expect(restored.tables.test.currentIndex).toMatchObject(
      schema.tables.test.currentIndex
    );
  });
});
