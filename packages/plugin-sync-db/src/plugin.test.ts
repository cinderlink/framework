import { SyncPluginEvents } from "./../../core-types";
import * as ethers from "ethers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TableRow,
  TableInterface,
  SyncConfig,
  CinderlinkClientInterface,
  ProtocolEvents,
  SchemaInterface,
  TableDefinition,
} from "@cinderlink/core-types";
import {
  createDID,
  createSeed,
  signAddressVerification,
} from "@cinderlink/identifiers";
import { createClient } from "../../client";
import { rmSync } from "fs";
import SyncDBPlugin from "./plugin";
import { Schema } from "../../ipld-database";

interface DidRow extends TableRow {
  did: string;
  content: string;
  updatedAt: number;
}

const didRowDef: TableDefinition<DidRow> = {
  schemaId: "test",
  encrypted: true,
  rollup: 10,
  aggregate: {},
  searchOptions: {
    fields: ["did", "content"],
  },
  schema: {
    type: "object",
    properties: {
      did: { type: "string" },
      content: { type: "string" },
      updatedAt: { type: "number" },
    },
  },
  indexes: {
    did: {
      unique: true,
      fields: ["did"],
    },
  },
};

const didRowSyncConfig: SyncConfig<DidRow> = {
  syncInterval: 100,
  query(table: TableInterface<DidRow>, params) {
    return table
      .query()
      .where("updatedAt", ">=", params.since || 0)
      .where("did", "=", params.did)
      .select();
  },
  async allowNewFrom() {
    return true;
  },
  async allowUpdateFrom(row: DidRow, did: string) {
    return did === row.did;
  },
  incomingRateLimit: 10000,
  outgoingRateLimit: 100,
};

describe("TableSync", () => {
  let client: CinderlinkClientInterface<SyncPluginEvents & ProtocolEvents>;
  let server: CinderlinkClientInterface<SyncPluginEvents & ProtocolEvents>;
  let clientSyncPlugin: SyncDBPlugin<typeof client>;
  let serverSyncPlugin: SyncDBPlugin<typeof server>;
  let clientSchema: SchemaInterface;
  let serverSchema: SchemaInterface;
  beforeEach(async () => {
    await rmSync("./test-sync-client", { recursive: true, force: true });
    await rmSync("./test-sync-server", { recursive: true, force: true });
    const clientWallet = ethers.Wallet.createRandom();
    const clientDID = await createDID(await createSeed("test sync client"));
    const clientAV = await signAddressVerification(
      "test",
      clientDID.id,
      clientWallet
    );
    client = await createClient<SyncPluginEvents & ProtocolEvents>({
      did: clientDID,
      address: clientWallet.address as `0x${string}`,
      addressVerification: clientAV,
      role: "peer",
      options: {
        repo: "test-sync-client",
      },
    });

    const serverWallet = ethers.Wallet.createRandom();
    const serverDID = await createDID(await createSeed("test sync server"));
    const serverAV = await signAddressVerification(
      "test",
      serverDID.id,
      serverWallet
    );
    server = await createClient<SyncPluginEvents & ProtocolEvents>({
      did: serverDID,
      address: serverWallet.address as `0x${string}`,
      addressVerification: serverAV,
      role: "server",
      options: {
        repo: "test-sync-server",
        config: {
          Addresses: {
            Swarm: ["/ip4/127.0.0.1/tcp/7386", "/ip4/127.0.0.1/tcp/7387/ws"],
            API: "/ip4/127.0.0.1/tcp/7388",
            Gateway: "/ip4/127.0.0.1/tcp/7389",
          },
          Bootstrap: [],
        },
      },
    });
    server.initialConnectTimeout = 0;

    await server.start([]);
    const serverPeer = await server.ipfs.id();
    client.initialConnectTimeout = 0;

    await Promise.all([
      client.start([serverPeer.addresses[0].toString()]),
      client.pluginEvents.once("/cinderlink/handshake/success"),
      server.pluginEvents.once("/cinderlink/handshake/success"),
    ]);

    if (!server.hasSchema("test")) {
      serverSchema = new Schema(
        "test",
        { didRows: didRowDef },
        server.dag,
        server.logger.module("db").submodule(`schema:test`)
      );
      await server.addSchema("test", serverSchema);
    }

    if (!client.hasSchema("test")) {
      clientSchema = new Schema(
        "test",
        { didRows: didRowDef },
        client.dag,
        client.logger.module("db").submodule(`schema:test`)
      );
      await client.addSchema("test", clientSchema);
    }

    serverSyncPlugin = new SyncDBPlugin(server);
    await server.addPlugin(serverSyncPlugin);

    clientSyncPlugin = new SyncDBPlugin(client);
    await client.addPlugin(clientSyncPlugin);

    vi.spyOn(client, "send");
    vi.spyOn(client.p2p, "emit");
    vi.spyOn(server.p2p, "emit");
    vi.spyOn(clientSyncPlugin, "syncTableRows");
  });

  afterEach(async () => {
    vi.resetAllMocks();
    try {
      await client.stop().catch(() => {});
      await server.stop().catch(() => {});
    } catch (_) {}
    await rmSync("./test-sync-client", { recursive: true, force: true });
    await rmSync("./test-sync-server", { recursive: true, force: true });
  });

  it("should create new table configurations", async () => {
    clientSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    expect(clientSyncPlugin.syncing).toEqual({
      test: {
        didRows: didRowSyncConfig,
      },
    });
  });

  it("should send sync messages on an interval", async () => {
    clientSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    serverSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    await client.getSchema("test")?.getTable<DidRow>("didRows").insert({
      did: server.id,
      content: "test",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    // called once immediately at startup
    expect(clientSyncPlugin.syncTableRows).toHaveBeenCalledTimes(3);

    expect(client.send).toHaveBeenCalledWith(server.peerId?.toString(), {
      topic: "/cinderlink/sync/save/request",
      payload: {
        requestId: expect.any(String),
        schemaId: "test",
        tableId: "didRows",
        rows: [
          {
            id: 1,
            uid: expect.any(String),
            did: server.id,
            content: "test",
            createdAt: expect.any(Number),
            updatedAt: expect.any(Number),
          },
        ],
      },
    });

    expect(server.p2p.emit).toHaveBeenCalledWith(
      "/cinderlink/sync/save/request",
      {
        topic: "/cinderlink/sync/save/request",
        peer: expect.any(Object),
        encrypted: false,
        signed: false,
        recipients: undefined,
        payload: {
          requestId: expect.any(String),
          schemaId: "test",
          tableId: "didRows",
          rows: [
            {
              id: 1,
              uid: expect.any(String),
              did: server.id,
              content: "test",
              createdAt: expect.any(Number),
              updatedAt: expect.any(Number),
            },
          ],
        },
      }
    );
  });

  it("should not send sync messages if the row is not configured to be sent", async () => {
    clientSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    serverSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    await clientSchema.getTable<DidRow>("didRows").insert({
      did: "foobar",
      content: "test",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await new Promise((resolve) => setTimeout(resolve, 201));
    expect(client.send).not.toHaveBeenCalled();
  });

  it("should save incoming rows", async () => {
    clientSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    serverSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    const row = {
      did: server.id,
      content: "test",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const uid = await clientSchema.getTable<DidRow>("didRows").insert(row);
    const saved = await clientSchema.getTable<DidRow>("didRows").getByUid(uid);
    await new Promise((resolve) => setTimeout(resolve, 201));
    const serverRow = await serverSchema
      .getTable<DidRow>("didRows")
      .getByUid(uid);
    expect(client.send).toHaveBeenCalled();
    expect(serverRow).toEqual(saved);
  });

  it("should not send a row to the same peer twice", async () => {
    clientSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    serverSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    const uid = await clientSchema.getTable<DidRow>("didRows").insert({
      did: server.id,
      content: "test",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(client.p2p.emit).toHaveBeenCalledWith(
      "/cinderlink/sync/save/response",
      {
        topic: "/cinderlink/sync/save/response",
        encrypted: false,
        payload: {
          requestId: expect.any(String),
          schemaId: "test",
          tableId: "didRows",
          saved: [uid],
          errors: {},
        },
        peer: expect.any(Object),
        recipients: undefined,
        signed: false,
      }
    );
    expect(client.send).toHaveBeenLastCalledWith(server.peerId?.toString(), {
      topic: "/cinderlink/sync/save/request",
      payload: {
        requestId: expect.any(String),
        schemaId: "test",
        tableId: "didRows",
        rows: [
          {
            id: 1,
            uid: expect.any(String),
            did: server.id,
            content: "test",
            createdAt: expect.any(Number),
            updatedAt: expect.any(Number),
          },
        ],
      },
    });
    expect(client.send).toHaveBeenCalledOnce();
  });
});
