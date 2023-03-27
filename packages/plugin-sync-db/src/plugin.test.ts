import { TestClient } from "@cinderlink/test-adapters/src/client";
import { createPeerId } from "@cinderlink/test-adapters/src/peer-id";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TableRow, TableInterface, SyncConfig } from "@cinderlink/core-types";
import { createDID, createSeed } from "@cinderlink/identifiers";
import { Schema } from "@cinderlink/ipld-database";
import SyncDBPlugin from "./plugin";

const testSeed = await createSeed("test");
const testDID = await createDID(testSeed);
const testSeedB = await createSeed("test-b");
const testPeerIdB = await createPeerId(testSeed);
const testDIDB = await createDID(testSeedB);
let testClient: TestClient<any>;
let syncPlugin: SyncDBPlugin;
let schema: Schema;

interface DidRow extends TableRow {
  did: string;
  content: string;
  updatedAt: number;
}

const didRowSyncConfig: SyncConfig<DidRow> = {
  syncInterval: 1000,
  query(table: TableInterface<DidRow>, params) {
    return table.query().where("updatedAt", ">", params.since).select();
  },
  async syncRowTo(row: DidRow) {
    return [row.did];
  },
  async allowNewFrom() {
    return true;
  },
  async allowUpdateFrom(row: DidRow, did: string) {
    return did === row.did;
  },
  async allowFetchFrom() {
    return false;
  },
  incomingRateLimit: 10000,
  outgoingRateLimit: 100,
};

describe("TableSync", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    testClient = new TestClient(testDID);
    testClient.send = vi.fn() as any;
    testClient.peers.addPeer(testPeerIdB, "peer", testDIDB.id);
    testClient.peers.updatePeer(testPeerIdB.toString(), {
      authenticated: true,
      connected: true,
    });
    syncPlugin = new SyncDBPlugin(testClient as any, {
      syncing: {},
    });
    testClient.addPlugin(syncPlugin as any);

    schema = new Schema(
      "test",
      {
        didRows: {
          schemaId: "test",
          encrypted: false,
          aggregate: {},
          indexes: {},
          rollup: 1000,
          searchOptions: {
            fields: ["did", "content"],
          },
          schema: {
            type: "object",
            properties: {
              did: {
                type: "string",
              },
              content: {
                type: "string",
              },
            },
            required: ["did", "content"],
          },
        },
        related: {
          schemaId: "test",
          encrypted: false,
          aggregate: {},
          indexes: {},
          rollup: 1000,
          searchOptions: {
            fields: ["rowUid", "content"],
          },
          schema: {
            type: "object",
            properties: {
              uid: {
                type: "string",
              },
              content: {
                type: "string",
              },
            },
            required: ["rowUid", "content"],
          },
        },
      },
      testClient.dag
    );

    testClient.addSchema("test", schema);
    await testClient.start();
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  it("should create new table configurations", async () => {
    syncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    expect(syncPlugin.syncing).toEqual({
      test: {
        didRows: didRowSyncConfig,
      },
    });
    expect(syncPlugin.timers).not.toEqual({});
  });

  it("should send sync messages on an interval", async () => {
    syncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    await schema.getTable<DidRow>("didRows").insert({
      did: testDIDB.id,
      content: "test",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await vi.runOnlyPendingTimersAsync();
    expect(testClient.send).toHaveBeenCalledWith(testPeerIdB.toString(), {
      topic: "/cinderlink/sync/save/request",
      payload: {
        requestId: expect.any(String),
        schemaId: "test",
        tableId: "didRows",
        rows: [
          {
            id: 1,
            uid: expect.any(String),
            did: testDIDB.id,
            content: "test",
            createdAt: expect.any(Number),
            updatedAt: expect.any(Number),
          },
        ],
      },
    });
  });

  it("should not send sync messages if the row is not configured to be sent", async () => {
    syncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    await schema.getTable<DidRow>("didRows").insert({
      did: "foobar",
      content: "test",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await vi.runOnlyPendingTimersAsync();
    expect(testClient.send).not.toHaveBeenCalled();
  });

  it("should save incoming rows", async () => {
    syncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    const row = {
      did: testDIDB.id,
      content: "test",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const uid = await schema.getTable<DidRow>("didRows").computeUid(row);
    await testClient.p2p.emit("/cinderlink/sync/save/request", {
      peer: {
        peerId: testPeerIdB,
        did: testDIDB.id,
        role: "peer",
        subscriptions: [],
        metadata: {},
        authenticated: true,
        connected: true,
      },
      topic: "/cinderlink/sync/save/request",
      payload: {
        requestId: "test",
        schemaId: "test",
        tableId: "didRows",
        rows: [
          {
            ...row,
            uid,
          },
        ],
      },
      signed: false,
      encrypted: false,
    });
    console.info(
      "saved row",
      await schema.getTable<DidRow>("didRows").getByUid(uid),
      uid
    );
    const allRows = await schema
      .getTable<DidRow>("didRows")
      .query()
      .select()
      .execute()
      .then((r) => r.all());
    console.info(allRows);
    const savedRow = await schema.getTable<DidRow>("didRows").getByUid(uid);
    expect(savedRow).toEqual({
      id: 1,
      uid: expect.any(String),
      did: testDIDB.id,
      content: "test",
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
  });

  it("should not send a row to the same peer twice", async () => {
    syncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    const uid = await schema.getTable<DidRow>("didRows").insert({
      did: testDIDB.id,
      content: "test",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await vi.advanceTimersByTimeAsync(1000);
    await testClient.p2p.emit("/cinderlink/sync/save/response", {
      peer: {
        peerId: testPeerIdB,
        did: testDIDB.id,
        role: "peer",
        subscriptions: [],
        metadata: {},
        authenticated: true,
        connected: true,
      },
      topic: "/cinderlink/sync/save/response",
      payload: {
        requestId: "test",
        schemaId: "test",
        tableId: "didRows",
        saved: [uid],
      },
      signed: false,
      encrypted: false,
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(testClient.send).toHaveBeenCalledWith(testPeerIdB.toString(), {
      topic: "/cinderlink/sync/save/request",
      payload: {
        requestId: expect.any(String),
        schemaId: "test",
        tableId: "didRows",
        rows: [
          {
            id: 1,
            uid: expect.any(String),
            did: testDIDB.id,
            content: "test",
            createdAt: expect.any(Number),
            updatedAt: expect.any(Number),
          },
        ],
      },
    });
    expect(testClient.send).toHaveBeenCalledOnce();
  });
});
