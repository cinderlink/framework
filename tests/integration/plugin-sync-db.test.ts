import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IdentityServerPlugin } from "@cinderlink/plugin-identity-server";
import {
  TableRow,
  TableInterface,
  SyncConfig,
  CinderlinkClientInterface,
  ProtocolEvents,
  SchemaInterface,
  TableDefinition,
  SyncPluginEvents,
} from "@cinderlink/core-types";
import {
  createDID,
  createSeed,
  signAddressVerification,
} from "@cinderlink/identifiers";
import { createClient } from "@cinderlink/client";
import { rmSync } from "fs";
import SyncDBPlugin from "@cinderlink/plugin-sync-db";
import { Schema } from "@cinderlink/ipld-database";

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
  syncOnChange: false,
  query(table: TableInterface<DidRow>, params) {
    return table
      .query()
      .where("updatedAt", ">=", params.since || 0)
      .where("did", "=", params.did)
      .select();
  },
  allowNewFrom() {
    return true;
  },
  allowUpdateFrom(row: DidRow, did: string) {
    return did === row.did;
  },
  incomingRateLimit: 10000,
  outgoingRateLimit: 100,
};

describe("Plugin Sync DB Integration", () => {
  let client: CinderlinkClientInterface<SyncPluginEvents & ProtocolEvents>;
  let server: CinderlinkClientInterface<SyncPluginEvents & ProtocolEvents>;
  let clientSyncPlugin: SyncDBPlugin<typeof client>;
  let serverSyncPlugin: SyncDBPlugin<typeof server>;
  let clientSchema: SchemaInterface;
  let serverSchema: SchemaInterface;
  beforeEach(async () => {
    await rmSync("./test-sync-client", { recursive: true, force: true });
    await rmSync("./test-sync-server", { recursive: true, force: true });
    
    // Create client account with viem
    const clientPrivateKey = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
    const clientAccount = privateKeyToAccount(clientPrivateKey);
    const clientWalletClient = createWalletClient({
      account: clientAccount,
      chain: mainnet,
      transport: http(),
    });
    
    const clientDID = await createDID(await createSeed("test sync client"));
    const clientAV = await signAddressVerification(
      "test",
      clientDID.id,
      clientAccount,
      clientWalletClient
    );
    client = await createClient<SyncPluginEvents & ProtocolEvents>({
      did: clientDID,
      address: clientAccount.address,
      addressVerification: clientAV,
      role: "peer",
      options: {
      },
    });

    // Create server account with viem
    const serverPrivateKey = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
    const serverAccount = privateKeyToAccount(serverPrivateKey);
    const serverWalletClient = createWalletClient({
      account: serverAccount,
      chain: mainnet,
      transport: http(),
    });
    
    const serverDID = await createDID(await createSeed("test sync server"));
    const serverAV = await signAddressVerification(
      "test",
      serverDID.id,
      serverAccount,
      serverWalletClient
    );
    server = await createClient<SyncPluginEvents & ProtocolEvents>({
      did: serverDID,
      address: serverAccount.address,
      addressVerification: serverAV,
      role: "server",
      options: {
        libp2p: {
          addresses: {
            listen: ["/ip4/127.0.0.1/tcp/7386", "/ip4/127.0.0.1/tcp/7387/ws"],
          },
        },
      },
    });
    server.initialConnectTimeout = 0;
    const identity = new IdentityServerPlugin(server);
    server.addPlugin(identity);

    await Promise.all([server.start([]), server.once("/client/ready")]);
    const serverPeerId = server.ipfs.libp2p.peerId;
    console.info("server ready");

    await Promise.all([
      client.start([`/ip4/127.0.0.1/tcp/7387/ws/p2p/${serverPeerId}`]),
      client.once("/client/ready"),
      client.once("/server/connect"),
      client.once("/identity/resolved"),
    ]);
    console.info("client ready");

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
    clientSyncPlugin = new SyncDBPlugin(client);
    await Promise.all([
      server.addPlugin(serverSyncPlugin),
      client.addPlugin(clientSyncPlugin),
    ]);

    // vi.useFakeTimers();
    vi.spyOn(client, "send");
    vi.spyOn(client.p2p, "emit");
    vi.spyOn(server.p2p, "emit");
    vi.spyOn(clientSyncPlugin, "syncTableRows");
  });

  afterEach(async () => {
    vi.clearAllMocks();
    // vi.useRealTimers();
    try {
      await client.stop().catch(() => {
        // Ignore stop errors in cleanup
      });
      await server.stop().catch(() => {
        // Ignore stop errors in cleanup
      });
    } catch (_error) {
      // Ignore cleanup errors
    }
    await rmSync("./test-sync-client", { recursive: true, force: true });
    await rmSync("./test-sync-server", { recursive: true, force: true });
  });

  it("should create new table configurations", async () => {
    clientSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    serverSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    await client.getSchema("test")?.getTable<DidRow>("didRows").insert({
      did: client.did.id,
      content: "test",
      updatedAt: Date.now(),
    });
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
      did: client.did.id,
      content: "test",
      updatedAt: Date.now(),
    });
    await new Promise((resolve) => setTimeout(resolve, 201));

    // called once immediately at startup
    expect(clientSyncPlugin.syncTableRows).toHaveBeenCalledTimes(3);
  });

  it("should not send sync messages if the row is not configured to be sent", async () => {
    clientSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    serverSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    await client.getSchema("test")?.getTable<DidRow>("didRows").insert({
      did: client.did.id,
      content: "test",
      updatedAt: Date.now(),
    });
    await new Promise((resolve) => setTimeout(resolve, 201));
    expect(vi.mocked(client.send).mock.calls.length).toBe(0);
  });

  it("should save incoming rows", async () => {
    clientSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    serverSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    await server.getSchema("test")?.getTable<DidRow>("didRows").insert({
      did: server.did.id,
      content: "test",
      updatedAt: Date.now(),
    });
    await new Promise((resolve) => setTimeout(resolve, 201));
    const saved = await serverSchema.getTable<DidRow>("didRows").getByUid("1");
    const clientRow = await clientSchema.getTable<DidRow>("didRows").getByUid("1");
    expect(clientRow).toEqual(saved);
  });

  it.skip("should not send a row to the same peer twice", async () => {
    clientSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    serverSyncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    const uid = await clientSchema.getTable<DidRow>("didRows").insert({
      did: client.did.id,
      content: "test",
      updatedAt: Date.now(),
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
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
        signed: true,
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
            did: client.did.id,
            content: "test",
            updatedAt: expect.any(Number),
          },
        ],
      },
    });
    expect(client.send).toHaveBeenCalledOnce();
  });
});