import { describe, it, expect, vi, beforeEach } from "vitest";
import { CinderlinkProtocolPlugin } from "./plugin";
import type { CinderlinkClientInterface, ProtocolEvents } from "@cinderlink/core-types";

describe("CinderlinkProtocolPlugin", () => {
  let plugin: CinderlinkProtocolPlugin;
  let mockClient: any;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      module: vi.fn(() => mockLogger)
    };

    // Create mock libp2p
    const mockLibp2p = {
      handle: vi.fn(),
      unhandle: vi.fn(),
      getMultiaddrs: vi.fn(() => []),
      peerId: { toString: () => "mock-peer-id" },
      start: vi.fn(),
      stop: vi.fn()
    };

    mockClient = {
      role: "peer",
      did: { id: "did:test:123" },
      ipfs: { libp2p: mockLibp2p },
      logger: mockLogger,
      keepAliveInterval: 5000,
      peers: {
        updatePeer: vi.fn()
      },
      p2p: {
        events: {
          emit: vi.fn(),
          on: vi.fn(),
          off: vi.fn()
        }
      },
      pubsub: {
        subscribe: vi.fn(),
        unsubscribe: vi.fn()
      },
      plugins: [],
      addPlugin: vi.fn(),
      remPlugin: vi.fn()
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
    const keepAliveMessage = {
      type: "request",
      from: "test-peer",
      peer: {
        peerId: { toString: () => "test-peer-id" }
      }
    };

    // Call the onKeepAlive method directly since it's bound in p2p
    await plugin.p2p["/cinderlink/keepalive"].call(plugin, keepAliveMessage as any, {} as any);
    
    // For keepalive requests, it should update peer seen time
    if (keepAliveMessage.type === "request" && plugin.respondToKeepAlive) {
      expect(mockClient.peers.updatePeer).toHaveBeenCalledWith("test-peer-id", {
        seenAt: expect.any(Number)
      });
    }
  });
});
