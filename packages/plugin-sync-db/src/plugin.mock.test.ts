import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import type { DID } from "dids";
import type { PeerId } from "@libp2p/interface";
import { CID } from "multiformats/cid";
import { base58btc } from "multiformats/bases/base58";
import SyncDBPlugin from "./plugin";
import type {
  TableRow,
  SyncConfig,
  QueryBuilderInterface,
  TableDefinition,
  SyncPluginEvents,
  ProtocolEvents,
  Peer,
  P2PMessage,
  P2PMessageWithPeer,
} from "@cinderlink/core-types";
import { TestClient, TestLogger } from "@cinderlink/test-adapters";
import { createDID, createSeed } from "@cinderlink/identifiers";
import { Schema } from "@cinderlink/ipld-database";

// Types for our test mocks
interface MockPeerId extends PeerId {
  toString(): string;
  toBytes(): Uint8Array;
  toCID(): CID;
  type: string;
  equals(other: PeerId): boolean;
  multihash: Uint8Array;
}

interface MockPeer extends Peer {
  peerId: MockPeerId;
  did: string;
  role: 'client' | 'server';
  subscriptions: string[];
  metadata: Record<string, unknown>;
  connected: boolean;
}

interface MockIncomingMessage extends P2PMessageWithPeer<unknown> {
  topic: string;
  peer: MockPeer;
  payload: {
    requestId: string;
    schemaId: string;
    tableId: string;
    rows: Array<Record<string, unknown>>;
  };
}

interface DidRow extends TableRow {
  did: string;
  content: string;
  updatedAt: number;
}

const didRowTableDef: TableDefinition<DidRow> = {
  schemaId: "test",
  encrypted: false,
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

describe("SyncDBPlugin Unit Tests", () => {
  let client: TestClient<SyncPluginEvents & ProtocolEvents>;
  let syncPlugin: SyncDBPlugin<typeof client>;
  let did: DID;

  beforeAll(async () => {
    const seed = await createSeed("test seed");
    did = await createDID(seed);
  });

  beforeEach(async () => {
    // Create a TestClient with proper event emitters
    client = new TestClient(did);
    
    // Add the sync plugin
    syncPlugin = new SyncDBPlugin(client);
    await client.addPlugin(syncPlugin);
    
    // Add a test schema with our table
    const logger = new TestLogger();
    const sublogger = logger.module("db").submodule("schema:test");
    const testSchema = new Schema(
      "test",
      { didRows: didRowTableDef },
      client.dag,
      sublogger,
      false
    );
    client.addSchema("test", testSchema);
  });

  it("should initialize with correct id and empty syncing configuration", () => {
    expect(syncPlugin.id).toBe("sync");
    expect(syncPlugin.syncing).toEqual({});
  });

  it("should add table sync configuration", () => {
    const didRowSyncConfig: SyncConfig<DidRow> = {
      query: vi.fn().mockReturnValue({
        instructions: [],
        terminator: undefined,
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([]),
      } as unknown as QueryBuilderInterface<DidRow>),
      allowNewFrom: vi.fn().mockResolvedValue(true),
      allowUpdateFrom: vi.fn().mockResolvedValue(true),
      incomingRateLimit: 10000,
      outgoingRateLimit: 100,
    };
    
    syncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    
    expect(syncPlugin.syncing).toEqual({
      test: {
        didRows: didRowSyncConfig,
      },
    });
  });

  it("should start and stop plugin lifecycle", async () => {
    expect(syncPlugin.started).toBe(true); // TestClient starts plugins automatically
    
    await syncPlugin.stop();
    expect(syncPlugin.started).toBe(false);
    
    await syncPlugin.start();
    expect(syncPlugin.started).toBe(true);
  });

  it("should handle sync save requests with permission checks", async () => {
    // Create sync config with mocked permission functions
    const didRowSyncConfig: SyncConfig<DidRow> = {
      query: vi.fn(),
      allowNewFrom: vi.fn().mockResolvedValue(true),
      allowUpdateFrom: vi.fn().mockResolvedValue(true),
      incomingRateLimit: 10000,
      outgoingRateLimit: 100,
    };
    
    syncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    
    // Get the actual table from the schema
    const testSchema = client.getSchema("test");
    const didRowsTable = testSchema?.getTable<DidRow>("didRows");
    
    expect(didRowsTable).toBeDefined();
    
    // Mock the table methods we need for the test
    vi.spyOn(didRowsTable!, 'getByUid').mockResolvedValue(null);
    const upsertSpy = vi.spyOn(didRowsTable!, 'upsert').mockResolvedValue("uid-1");
    
    // Create a mock CID for testing
    const mockCid = CID.parse('bafybeihq6x5q3v5s4y4v5q3v5s4y4v5q3v5s4y4v5q3v5s4y4v5q3v5s4y4');
    
    const mockPeerId: MockPeerId = {
      toString: () => "peer-123",
      toBytes: () => new Uint8Array(),
      toCID: () => mockCid,
      type: "Ed25519",
      equals: () => false,
      multihash: new Uint8Array([0x12, 0x20, ...new Uint8Array(32).fill(1)]),
      bytes: new Uint8Array(),
    };
    
    const incomingMessage: MockIncomingMessage = {
      topic: "/cinderlink/sync/save/request",
      peer: {
        peerId: mockPeerId,
        did: "did:test:peer1",
        role: "server",
        subscriptions: [],
        metadata: {},
        connected: true,
      },
      payload: {
        requestId: "req-123",
        schemaId: "test",
        tableId: "didRows",
        rows: [
          {
            id: 1,
            uid: "uid-1",
            did: "did:test:456",
            content: "test content",
            updatedAt: Date.now(),
          },
        ],
      },
      from: "peer-123",
      to: undefined,
      timestamp: Date.now(),
      id: "msg-123",
    };
    
    // Call the handler directly
    await syncPlugin.onSyncSaveRequest(incomingMessage);
    
    // Verify permission check was called with correct parameters
    expect(didRowSyncConfig.allowNewFrom).toHaveBeenCalledWith(
      "did:test:peer1",
      expect.any(Object), // table
      expect.any(Object)  // client
    );
    
    // Verify upsert was called with correct arguments
    expect(upsertSpy).toHaveBeenCalledWith(
      { uid: "uid-1" },
      expect.objectContaining({
        did: "did:test:456",
        content: "test content",
      })
    );
  });

  it("should handle peer connections", async () => {
    const sendSpy = vi.spyOn(client, 'send');
    
    // Create a mock CID for testing
    const mockCid = CID.parse('bafybeihq6x5q3v5s4y4v5q3v5s4y4v5q3v5s4y4v5q3v5s4y4v5q3v5s4y4');
    
    const mockPeerId: MockPeerId = {
      toString: () => "peer-123",
      toBytes: () => new Uint8Array(),
      toCID: () => mockCid,
      type: "Ed25519",
      equals: () => false,
      multihash: new Uint8Array([0x12, 0x20, ...new Uint8Array(32).fill(1)]),
      bytes: new Uint8Array(),
    };
    
    const peer: MockPeer = {
      peerId: mockPeerId,
      did: "did:test:peer1",
      role: "server",
      subscriptions: [],
      metadata: {},
      connected: true,
    };
    
    await syncPlugin.onPeerConnect(peer);
    
    expect(sendSpy).toHaveBeenCalledWith(
      "peer-123",
      expect.objectContaining({
        topic: "/cinderlink/sync/since",
        payload: {
          since: 0,
        },
      })
    );
  });

  it("should filter rows based on sync config", async () => {
    const didRowSyncConfig: SyncConfig<DidRow> = {
      query: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue([
          { id: 1, uid: "uid-1", did: "did:test:123", content: "content1", updatedAt: 100 },
          { id: 2, uid: "uid-2", did: "did:test:456", content: "content2", updatedAt: 200 },
        ]),
      } as unknown as QueryBuilderInterface<DidRow>),
      allowNewFrom: vi.fn().mockResolvedValue(true),
      allowUpdateFrom: vi.fn().mockResolvedValue(true),
      incomingRateLimit: 10000,
      outgoingRateLimit: 100,
    };
    
    syncPlugin.addTableSync("test", "didRows", didRowSyncConfig);
    
    // The sync config should be used to query rows
    expect(syncPlugin.syncing.test.didRows.query).toBeDefined();
  });
});
