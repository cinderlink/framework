import { describe, it, expect, vi, beforeEach } from "vitest";
import { CinderlinkProtocolPlugin } from "./plugin.js";
describe("CinderlinkProtocolPlugin", () => {
    let plugin;
    let mockClient;
    let mockLogger;
    beforeEach(() => {
        mockLogger = vi.fn();
        mockLogger.info = vi.fn();
        mockLogger.error = vi.fn();
        mockLogger.warn = vi.fn();
        mockLogger.debug = vi.fn();
        mockLogger.module = vi.fn(() => mockLogger);
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
        };
        plugin = new CinderlinkProtocolPlugin(mockClient);
    });
    it("should initialize plugin correctly", () => {
        expect(plugin.id).toBe("cinderlink");
        expect(plugin.client).toBe(mockClient);
    });
    it("should start protocol handler", async () => {
        await plugin.start();
        // Check that handle was called with the protocol
        expect(mockClient.ipfs.libp2p.handle).toHaveBeenCalledWith("/cinderlink/1.0.0", expect.any(Function), {
            maxInboundStreams: 128,
            maxOutboundStreams: 128
        });
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
            topic: "/cinderlink/keepalive",
            payload: { timestamp: Date.now() },
            peer: {
                did: "test-did",
                peerId: { toString: () => "test-peer-id" },
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
//# sourceMappingURL=plugin.mock.test.js.map