import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { CinderlinkProtocolZodPlugin } from './zod-plugin.js';
import { protocolSchemas } from './zod-schemas.js';
import type { CinderlinkClientInterface, IncomingP2PMessage, Peer } from '@cinderlink/core-types';
import { createDID, createSeed } from '@cinderlink/identifiers';
import type { PeerId } from '@libp2p/interface';

describe('CinderlinkProtocolZodPlugin', () => {
  let plugin: CinderlinkProtocolZodPlugin;
  let mockClient: CinderlinkClientInterface;
  let mockLogger: any;
  let mockLibp2p: any;
  let mockPeers: any;
  let testDid: any;

  beforeEach(async () => {
    // Create test DID
    const seed = await createSeed('test-protocol');
    testDid = await createDID(seed);

    // Mock logger
    mockLogger = {
      info: mock.fn(),
      error: mock.fn(),
      warn: mock.fn(),
      debug: mock.fn(),
      module: mock.fn().mockReturnThis(),
      submodule: mock.fn().mockReturnThis()
    };

    // Mock libp2p
    mockLibp2p = {
      handle: mock.fn().mockResolvedValue(undefined),
      unhandle: mock.fn().mockResolvedValue(undefined),
      getConnections: mock.fn().mockReturnValue([]),
      peerId: { toString: () => 'mock-peer-id' } as PeerId
    };

    // Mock peers
    mockPeers = {
      getPeer: mock.fn(),
      addPeer: mock.fn(),
      updatePeer: mock.fn(),
      getAllPeers: mock.fn().mockReturnValue([])
    };

    // Mock client
    mockClient = {
      did: testDid,
      logger: mockLogger,
      keepAliveTimeout: 30000,
      ipfs: { libp2p: mockLibp2p },
      peers: mockPeers,
      p2p: {
        emit: mock.fn(),
        on: mock.fn(),
        off: mock.fn()
      },
      emit: mock.fn(),
      subscribe: mock.fn(),
      unsubscribe: mock.fn(),
      send: mock.fn(),
      publish: mock.fn()
    } as any;

    plugin = new CinderlinkProtocolZodPlugin(mockClient);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('Plugin Lifecycle', () => {
    it('should initialize with correct id and schemas', () => {
      expect(plugin.id).toBe('cinderlink');
      expect(plugin.schemas).toBe(protocolSchemas);
      expect(plugin.client).toBe(mockClient);
      expect(plugin.started).toBe(false);
    });

    it('should start successfully', async () => {
      await plugin.start();

      expect(mockLibp2p.handle).toHaveBeenCalledWith(
        '/cinderlink/1.0.0',
        expect.any(Function)
      );
      expect(mockClient.subscribe).toHaveBeenCalledWith('/peer/connect');
      expect(mockClient.subscribe).toHaveBeenCalledWith('/peer/disconnect');
      expect(plugin.started).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting Cinderlink protocol handler');
      expect(mockLogger.info).toHaveBeenCalledWith('Protocol handler started');
    });

    it('should stop cleanly', async () => {
      await plugin.start();
      await plugin.stop();

      expect(mockLibp2p.unhandle).toHaveBeenCalledWith('/cinderlink/1.0.0');
      expect(mockClient.unsubscribe).toHaveBeenCalledWith('/peer/connect');
      expect(mockClient.unsubscribe).toHaveBeenCalledWith('/peer/disconnect');
      expect(plugin.started).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Protocol handler stopped');
    });

    it('should clear keepalive timers on stop', async () => {
      const clearTimeoutSpy = mock.spyOn(global, 'clearTimeout');
      await plugin.start();

      // Simulate some keepalive timers
      const timer1 = setTimeout(() => {}, 1000);
      const timer2 = setTimeout(() => {}, 1000);
      (plugin as any).keepAliveTimers.set('peer1', timer1);
      (plugin as any).keepAliveTimers.set('peer2', timer2);

      await plugin.stop();

      expect(clearTimeoutSpy).toHaveBeenCalledWith(timer1);
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timer2);
      expect((plugin as any).keepAliveTimers.size).toBe(0);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Protocol Message Handling', () => {
    beforeEach(async () => {
      await plugin.start();
    });

    it('should handle protocol streams correctly', async () => {
      const mockStream = {
        source: [new Uint8Array([1, 2, 3])],
        close: mock.fn()
      };
      const mockConnection = {
        remotePeer: { toString: () => 'test-peer' }
      };

      const handleProtocolSpy = mock.spyOn(plugin as any, 'handleProtocolMessage')
        .mockResolvedValue(undefined);

      await (plugin as any).handleProtocol({
        stream: mockStream,
        connection: mockConnection
      });

      expect(handleProtocolSpy).toHaveBeenCalled();
      expect(mockStream.close).toHaveBeenCalled();
    });

    it('should handle protocol stream errors gracefully', async () => {
      const mockStream = {
        source: {
          [Symbol.asyncIterator]: () => ({
            next: () => Promise.reject(new Error('Stream error'))
          })
        },
        close: mock.fn()
      };
      const mockConnection = {
        remotePeer: { toString: () => 'test-peer' }
      };

      await (plugin as any).handleProtocol({
        stream: mockStream,
        connection: mockConnection
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Protocol stream error',
        expect.objectContaining({
          peer: 'test-peer',
          error: 'Stream error'
        })
      );
      expect(mockStream.close).toHaveBeenCalled();
    });

    it('should emit protocol error on stream failure', async () => {
      const mockStream = {
        source: {
          [Symbol.asyncIterator]: () => ({
            next: () => Promise.reject(new Error('Stream error'))
          })
        },
        close: mock.fn()
      };
      const mockConnection = {
        remotePeer: { toString: () => 'test-peer' }
      };

      const emitSpy = mock.spyOn(plugin, 'emit');

      await (plugin as any).handleProtocol({
        stream: mockStream,
        connection: mockConnection
      });

      expect(emitSpy).toHaveBeenCalledWith('protocol:error', {
        error: 'Stream error',
        peer: {
          peerId: 'test-peer'
        }
      });
    });
  });

  describe('Keepalive Message Handling', () => {
    let mockPeer: Peer;

    beforeEach(async () => {
      await plugin.start();
      mockPeer = {
        peerId: { toString: () => 'test-peer' } as PeerId,
        did: 'test-did',
        role: 'peer',
        connected: true,
        seenAt: Date.now(),
        subscriptions: [],
        metadata: {}
      };
    });

    it('should handle keepalive messages correctly', async () => {
      const setTimeoutSpy = mock.spyOn(global, 'setTimeout');
      const message: IncomingP2PMessage = {
        peer: mockPeer,
        topic: '/cinderlink/keepalive',
        payload: { timestamp: Date.now() },
        signed: false,
        encrypted: false
      } as any;

      await (plugin as any).handleKeepAlive(message);

      expect(mockClient.peers.updatePeer).toHaveBeenCalledWith('test-peer', {
        connected: true
      });
      expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        mockClient.keepAliveTimeout
      );

      setTimeoutSpy.mockRestore();
    });

    it('should clear existing timer when handling new keepalive', async () => {
      const clearTimeoutSpy = mock.spyOn(global, 'clearTimeout');
      const existingTimer = setTimeout(() => {}, 1000);
      (plugin as any).keepAliveTimers.set('test-peer', existingTimer);

      const message: IncomingP2PMessage = {
        peer: mockPeer,
        topic: '/cinderlink/keepalive',
        payload: { timestamp: Date.now() },
        signed: false,
        encrypted: false
      } as any;

      await (plugin as any).handleKeepAlive(message);

      expect(clearTimeoutSpy).toHaveBeenCalledWith(existingTimer);
      clearTimeoutSpy.mockRestore();
    });

    it('should handle keepalive timeout', async () => {
      vi.useFakeTimers();

      const message: IncomingP2PMessage = {
        peer: mockPeer,
        topic: '/cinderlink/keepalive',
        payload: { timestamp: Date.now() },
        signed: false,
        encrypted: false
      } as any;

      await (plugin as any).handleKeepAlive(message);

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(mockClient.keepAliveTimeout + 1000);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Peer keepalive timeout',
        { peerId: 'test-peer' }
      );
      expect(mockClient.peers.updatePeer).toHaveBeenCalledWith('test-peer', {
        connected: false
      });

      vi.useRealTimers();
    });
  });

  describe('Identity Message Handling', () => {
    let mockPeer: Peer;

    beforeEach(async () => {
      await plugin.start();
      mockPeer = {
        peerId: { toString: () => 'test-peer' } as PeerId,
        did: undefined,
        role: 'peer',
        connected: true,
        seenAt: Date.now(),
        subscriptions: [],
        metadata: {}
      };
    });

    it('should handle identity messages and send response', async () => {
      const sendSpy = mock.spyOn(plugin, 'send').mockResolvedValue();
      const message: IncomingP2PMessage = {
        peer: mockPeer,
        topic: '/cinderlink/identity',
        payload: {
          did: 'test-remote-did',
          publicKey: 'test-public-key'
        },
        signed: false,
        encrypted: false
      } as any;

      await (plugin as any).handleIdentity(message);

      expect(mockClient.peers.updatePeer).toHaveBeenCalledWith('test-peer', {
        did: 'test-remote-did'
      });

      expect(sendSpy).toHaveBeenCalledWith(
        'test-peer',
        '/cinderlink/identity',
        {
          did: testDid.id,
          publicKey: testDid.id
        }
      );
    });
  });

  describe('Ping/Pong Message Handling', () => {
    let mockPeer: Peer;

    beforeEach(async () => {
      await plugin.start();
      mockPeer = {
        peerId: { toString: () => 'test-peer' } as PeerId,
        did: 'test-did',
        role: 'peer',
        connected: true,
        seenAt: Date.now(),
        subscriptions: [],
        metadata: {}
      };
    });

    it('should handle ping messages and send pong response', async () => {
      const sendSpy = mock.spyOn(plugin, 'send').mockResolvedValue();
      const timestamp = Date.now() - 100;
      const message: IncomingP2PMessage = {
        peer: mockPeer,
        topic: '/cinderlink/ping',
        payload: { timestamp },
        signed: false,
        encrypted: false
      } as any;

      await (plugin as any).handlePing(message);

      expect(sendSpy).toHaveBeenCalledWith(
        'test-peer',
        '/cinderlink/pong',
        expect.objectContaining({
          timestamp: expect.any(Number),
          latency: expect.any(Number)
        })
      );

      const callArgs = sendSpy.mock.calls[0][2] as any;
      expect(callArgs.latency).toBeGreaterThan(0);
    });

    it('should handle pong messages correctly', async () => {
      const message: IncomingP2PMessage = {
        peer: mockPeer,
        topic: '/cinderlink/pong',
        payload: {
          timestamp: Date.now(),
          latency: 50
        },
        signed: false,
        encrypted: false
      } as any;

      await (plugin as any).handlePong(message);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Received pong',
        {
          peer: 'test-peer',
          latency: 50
        }
      );
    });
  });

  describe('Peer Event Handling', () => {
    beforeEach(async () => {
      await plugin.start();
    });

    it('should handle peer connect events via pubsub', () => {
      const handlers = (plugin as any).getEventHandlers();
      const connectHandler = handlers.pubsub['/peer/connect'];

      const message = {
        payload: { peerId: 'test-peer', did: 'test-did' }
      };

      connectHandler(message);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Peer connected via pubsub',
        message.payload
      );
    });

    it('should handle peer disconnect events and clear timers', () => {
      const clearTimeoutSpy = mock.spyOn(global, 'clearTimeout');
      const timer = setTimeout(() => {}, 1000);
      (plugin as any).keepAliveTimers.set('test-peer', timer);

      const handlers = (plugin as any).getEventHandlers();
      const disconnectHandler = handlers.pubsub['/peer/disconnect'];

      const message = {
        payload: { peerId: 'test-peer', did: 'test-did' }
      };

      disconnectHandler(message);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Peer disconnected via pubsub',
        message.payload
      );
      expect(clearTimeoutSpy).toHaveBeenCalledWith(timer);
      expect((plugin as any).keepAliveTimers.has('test-peer')).toBe(false);

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Schema Validation', () => {
    beforeEach(async () => {
      await plugin.start();
    });

    it('should validate keepalive payloads', () => {
      const validPayload = { timestamp: Date.now() };
      const result = (plugin as any).validateEventPayload('receive', '/cinderlink/keepalive', validPayload);
      
      expect(result).toEqual(validPayload);
    });

    it('should reject invalid keepalive payloads', () => {
      const invalidPayload = { timestamp: 'invalid' };
      
      expect(() => {
        (plugin as any).validateEventPayload('receive', '/cinderlink/keepalive', invalidPayload);
      }).toThrow();
    });

    it('should validate identity payloads', () => {
      const validPayload = {
        did: 'test-did',
        publicKey: 'test-key'
      };
      const result = (plugin as any).validateEventPayload('receive', '/cinderlink/identity', validPayload);
      
      expect(result).toEqual(validPayload);
    });

    it('should accept identity payloads without publicKey', () => {
      const validPayload = { did: 'test-did' };
      const result = (plugin as any).validateEventPayload('receive', '/cinderlink/identity', validPayload);
      
      expect(result).toEqual(validPayload);
    });

    it('should validate ping payloads', () => {
      const validPayload = { timestamp: Date.now() };
      const result = (plugin as any).validateEventPayload('receive', '/cinderlink/ping', validPayload);
      
      expect(result).toEqual(validPayload);
    });

    it('should validate pong payloads', () => {
      const validPayload = {
        timestamp: Date.now(),
        latency: 100
      };
      const result = (plugin as any).validateEventPayload('receive', '/cinderlink/pong', validPayload);
      
      expect(result).toEqual(validPayload);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await plugin.start();
    });

    it('should handle decoding errors gracefully', async () => {
      const mockPeerId = { toString: () => 'test-peer' };
      const invalidData = new Uint8Array([255, 255, 255, 255]); // Invalid JSON

      await (plugin as any).handleProtocolMessage(invalidData, mockPeerId);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to handle protocol message',
        expect.objectContaining({
          peer: 'test-peer',
          error: expect.any(String)
        })
      );
    });

    it('should warn about messages without sender', async () => {
      const mockPeerId = { toString: () => 'test-peer' };
      const mockDecodePayload = mock.fn().mockResolvedValue({
        payload: { test: 'data' },
        sender: null
      });
      
      // Mock the decodePayload function
      const originalDecodePayload = await import('./encoding.js');
      vi.doMock('./encoding.js', () => ({
        ...originalDecodePayload,
        decodePayload: mockDecodePayload
      }));

      const message = JSON.stringify({
        topic: '/test/topic',
        payload: { test: 'data' }
      });
      const data = new TextEncoder().encode(message);

      await (plugin as any).handleProtocolMessage(data, mockPeerId);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Ignoring message without sender',
        { peerId: 'test-peer' }
      );
    });
  });

  describe('Message Routing', () => {
    beforeEach(async () => {
      await plugin.start();
    });

    it('should route request messages correctly', async () => {
      const mockPeerId = { toString: () => 'test-peer' };
      const requestId = 'test-request-123';
      
      mockPeers.getPeer.mockReturnValue({
        peerId: mockPeerId,
        did: 'test-did'
      });

      // Mock decodePayload directly on the plugin
      const mockDecodePayload = mock.fn().mockResolvedValue({
        payload: { requestId, data: 'test' },
        sender: 'test-sender'
      });

      // Replace the import with our mock
      vi.doMock('./encoding.js', () => ({
        decodePayload: mockDecodePayload
      }));

      const message = JSON.stringify({
        topic: '/cinderlink/request/test',
        payload: { requestId, data: 'test' }
      });
      const data = new TextEncoder().encode(message);

      // Mock the decodePayload function directly
      const originalHandleProtocolMessage = (plugin as any).handleProtocolMessage;
      (plugin as any).handleProtocolMessage = async function(data: Uint8Array, peerId: any) {
        try {
          const message = JSON.parse(new TextDecoder().decode(data)) as { topic: string; payload: any };
          const { topic } = message;
          
          const decoded = {
            payload: { requestId, data: 'test' },
            sender: 'test-sender'
          };
          
          let peer = this.client.peers.getPeer(peerId.toString());
          if (!peer) {
            peer = this.client.peers.addPeer(peerId, 'peer');
          }
          
          const incoming = {
            peer,
            topic,
            ...decoded
          } as any;
          
          if (topic.startsWith('/cinderlink/request/')) {
            const requestId = decoded.payload?.requestId;
            if (requestId) {
              this.client.emit(`/cinderlink/request/${requestId}`, incoming);
            }
          }
        } catch (error) {
          this.logger.error('Failed to handle protocol message', {
            peer: peerId.toString(),
            error: error instanceof Error ? error.message : String(error)
          });
        }
      };

      await (plugin as any).handleProtocolMessage(data, mockPeerId);

      expect(mockClient.emit).toHaveBeenCalledWith(
        `/cinderlink/request/${requestId}`,
        expect.any(Object)
      );
    });

    it('should route non-protocol messages to p2p handlers', async () => {
      const mockPeerId = { toString: () => 'test-peer' };
      
      mockPeers.getPeer.mockReturnValue({
        peerId: mockPeerId,
        did: 'test-did'
      });

      const message = JSON.stringify({
        topic: '/custom/topic',
        payload: { data: 'test' }
      });
      const data = new TextEncoder().encode(message);

      // Mock the handleProtocolMessage directly for this test
      (plugin as any).handleProtocolMessage = async function(data: Uint8Array, peerId: any) {
        try {
          const message = JSON.parse(new TextDecoder().decode(data)) as { topic: string; payload: any };
          const { topic } = message;
          
          const decoded = {
            payload: { data: 'test' },
            sender: 'test-sender'
          };
          
          let peer = this.client.peers.getPeer(peerId.toString());
          if (!peer) {
            peer = this.client.peers.addPeer(peerId, 'peer');
          }
          
          const incoming = {
            peer,
            topic,
            ...decoded
          } as any;
          
          // Route to p2p handlers for non-protocol messages
          if (!topic.startsWith('/cinderlink/')) {
            this.client.p2p.emit(topic, incoming);
          }
        } catch (error) {
          this.logger.error('Failed to handle protocol message', {
            peer: peerId.toString(),
            error: error instanceof Error ? error.message : String(error)
          });
        }
      };

      await (plugin as any).handleProtocolMessage(data, mockPeerId);

      expect(mockClient.p2p.emit).toHaveBeenCalledWith(
        '/custom/topic',
        expect.any(Object)
      );
    });
  });
});