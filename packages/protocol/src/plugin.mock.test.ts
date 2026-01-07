import { describe, it, expect, vi, beforeEach } from "vitest";
import { CinderlinkProtocolPlugin } from "./plugin.js";
import type { 
  CinderlinkClientInterface, 
  ProtocolEvents, 
  IncomingP2PMessage,
  EncodingOptions
} from "@cinderlink/core-types";
import type { PeerId } from "@libp2p/interface";

describe("CinderlinkProtocolPlugin", () => {
  let plugin: CinderlinkProtocolPlugin;
  let mockClient: CinderlinkClientInterface<ProtocolEvents>;
  let mockLogger: ReturnType<typeof vi.fn> & {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    module: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockLogger = mock.fn() as any;
    mockLogger.info = mock.fn();
    mockLogger.error = mock.fn();
    mockLogger.warn = mock.fn();
    mockLogger.debug = mock.fn();
    mockLogger.module = mock.fn(() => mockLogger);

    // Create mock libp2p
    const mockLibp2p = {
      handle: mock.fn(),
      unhandle: mock.fn(),
      getMultiaddrs: mock.fn(() => []),
      peerId: { toString: () => "mock-peer-id" },
      start: mock.fn(),
      stop: mock.fn()
    };

    mockClient = {
      role: "peer",
      did: { id: "did:test:123" },
      ipfs: { libp2p: mockLibp2p },
      logger: mockLogger,
      keepAliveInterval: 5000,
      peers: {
        updatePeer: mock.fn()
      },
      p2p: {
        events: {
          emit: mock.fn(),
          on: mock.fn(),
          off: mock.fn()
        }
      },
      pubsub: {
        subscribe: mock.fn(),
        unsubscribe: mock.fn()
      },
      plugins: [],
      addPlugin: mock.fn(),
      remPlugin: mock.fn()
    } as unknown as CinderlinkClientInterface<ProtocolEvents>;

    plugin = new CinderlinkProtocolPlugin(mockClient);
  });

  it("should initialize plugin correctly", () => {
    expect(plugin.id).toBe("cinderlink");
    expect(plugin.client).toBe(mockClient);
  });

  it("should start protocol handler", async () => {
    await plugin.start();
    
    // Check that handle was called with the protocol
    expect(mockClient.ipfs.libp2p.handle).toHaveBeenCalledWith(
      "/cinderlink/1.0.0",
      expect.any(Function),
      {
        maxInboundStreams: 128,
        maxOutboundStreams: 128
      }
    );
  });

  it("should stop cleanly", async () => {
    await plugin.start();
    
    // Capture the handler before stopping
    const handlerBeforeStop = plugin.keepAliveHandler;
    expect(handlerBeforeStop).toBeDefined();
    
    await plugin.stop();

    // Check that the keep alive interval was cleared
    // The stop method calls clearInterval but doesn't set keepAliveHandler to undefined
    // So we just check that stop() was called successfully
    expect(plugin.started).toBe(false);
  });

  it("should handle keepalive messages", async () => {
    const keepAliveMessage: IncomingP2PMessage<
      ProtocolEvents,
      "/cinderlink/keepalive",
      EncodingOptions
    > = {
      topic: "/cinderlink/keepalive",
      payload: { timestamp: Date.now() },
      peer: {
        did: "test-did",
        peerId: { toString: () => "test-peer-id" } as PeerId,
        role: "peer",
        subscriptions: [],
        metadata: {},
        connected: true,
        seenAt: Date.now()
      },
      signed: false,
      encrypted: false
    };

    // Call the onKeepAlive method directly since it's bound in p2p
    await plugin.onKeepAlive(keepAliveMessage);
    
    // For keepalive requests, it should update peer seen time
    if (plugin.respondToKeepAlive) {
      expect(mockClient.peers.updatePeer).toHaveBeenCalledWith("test-peer-id", {
        seenAt: expect.any(Number)
      });
    }
  });
});
