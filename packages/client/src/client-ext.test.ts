// @vitest-environment jsdom
// (Keep jsdom for consistency if any browser-like things are indirectly pulled, though not strictly needed for these tests)
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CinderlinkClient } from './client'; // Actual class
import {
  CinderlinkConstructorOptions,
  PluginInterface,
  PluginEventDef,
  LoggerInterface,
  SchemaInterface,
  IPFSWithLibP2P,
  CinderlinkClientEvents,
  ProtocolEvents,
  PeerRole
} from '@cinderlink/core-types';
import { DID } from 'dids';
import { PeerId } from '@libp2p/interface/peer-id';
import Emittery from 'emittery';

// Helper to create a mock PeerId (if needed by specific methods, though client constructor doesn't directly use methods of it)
const createMockPeerIdFromString = (idString: string): PeerId => ({
  toString: () => idString,
  equals: (other: any) => other?.toString() === idString,
  toBytes: () => new Uint8Array(Buffer.from(idString)),
} as PeerId);

// Mock Logger
const mockLoggerInstance: LoggerInterface = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  module: vi.fn(() => mockLoggerInstance),
  submodule: vi.fn(() => mockLoggerInstance),
};

// Mock a basic plugin
const createMockPlugin = (id: string): PluginInterface => ({
  id,
  logger: mockLoggerInstance,
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  p2p: {},
  pubsub: {},
  coreEvents: {},
  pluginEvents: {},
});

describe('CinderlinkClient Extended Tests', () => {
  let mockIpfs: IPFSWithLibP2P;
  let mockDid: DID;
  let clientOptions: CinderlinkConstructorOptions;
  let client: CinderlinkClient<PluginEventDef>;

  beforeEach(() => {
    mockIpfs = {
      // Helia doesn't have an explicit start, but CinderlinkClient calls stop()
      stop: vi.fn().mockResolvedValue(undefined),
      libp2p: {
        peerId: createMockPeerIdFromString('12D3KooWMockIpfsPeerId'),
        pubsub: {
          subscribe: vi.fn().mockResolvedValue(undefined),
          unsubscribe: vi.fn().mockResolvedValue(undefined),
          publish: vi.fn().mockResolvedValue(undefined),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(), // Required by Emittery if it checks for it
          dispatchEvent: vi.fn(), // Required by Emittery
          getTopics: vi.fn().mockReturnValue([]), // Required by Emittery
          getSubscribers: vi.fn().mockReturnValue(new Map()), // Required by Emittery
          setMaxListeners: vi.fn(), // Required by Emittery
        } as any, // Cast to any to satisfy specific pubsub interface if complex
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(), // For event emitter interface
        dispatchEvent: vi.fn(), // For event emitter interface
        services: {
            ipns: { resolve: vi.fn(), publish: vi.fn() }
        },
        dial: vi.fn(),
        peerStore: {
            get: vi.fn(),
            tags: { set: vi.fn(), get: vi.fn(), delete: vi.fn(), _tags: new Map() }, // Mock tags part of peerStore
            addressBook: { get: vi.fn(), set: vi.fn(), delete: vi.fn(), addrs: new Map() },
            protoBook: { set: vi.fn(), get: vi.fn() },
            metadataBook: { setValue: vi.fn(), getValue: vi.fn() },
            keyBook: { add: vi.fn(), get: vi.fn(), delete: vi.fn() },
            forEach: vi.fn(),
        } as any, // Simplified mock for peerStore
        getConnections: vi.fn().mockReturnValue([]),
        getProtocols: vi.fn().mockReturnValue([]),
        handle: vi.fn(),
        unhandle: vi.fn(),
        dialProtocol: vi.fn(),
        getPeers: vi.fn().mockReturnValue([]),
        hangUp: vi.fn(),
        isStarted: vi.fn().mockReturnValue(true), // Assume libp2p is started
        status: 'started' as any,

      },
      // Add other IPFS methods if directly called by client code under test
    } as unknown as IPFSWithLibP2P;

    mockDid = {
      id: 'did:key:zMockClientDID',
      createJWS: vi.fn().mockResolvedValue({ jws: 'mockJWS', kid: 'mockKid' }), // Add mock createJWS
      // Add other DID methods if they get called, e.g., resolve, decryptDagJWE (though Identity is mocked)
    } as unknown as DID; // Cast to DID, but it's a partial mock

    clientOptions = {
      ipfs: mockIpfs,
      did: mockDid,
      address: '0x123' as `0x${string}`, // Type assertion
      addressVerification: 'mockVerification',
      role: 'peer' as PeerRole,
      logger: mockLoggerInstance,
    };

    client = new CinderlinkClient(clientOptions);

    // Spy on internal emitters if direct calls to their .on/.emit are made by client methods
    vi.spyOn(client.p2p, 'on');
    vi.spyOn(client.pubsub, 'on');
    vi.spyOn(client.pluginEvents, 'on');
    // client itself is an Emittery, spy on its 'on' method for coreEvents
    vi.spyOn(client, 'on');


    // Mock methods on real instances created by the client's constructor
    vi.spyOn(client.identity, 'save').mockResolvedValue(undefined);
    // Mock client.save as it's called by addSchema and stop
    vi.spyOn(client, 'save').mockResolvedValue(undefined);


  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restores original implementations and clears spies
  });

  describe('Plugin Lifecycle', () => {
    it('addPlugin should add a plugin to the plugins object', () => {
      const mockPlugin = createMockPlugin('testPlugin1');
      client.addPlugin(mockPlugin);
      expect(client.plugins['testPlugin1']).toBe(mockPlugin);
    });

    it('addPlugin should call startPlugin if client is running', async () => {
      client.running = true; // Set client to running state
      const mockPlugin = createMockPlugin('testPlugin2');
      const startPluginSpy = vi.spyOn(client, 'startPlugin').mockResolvedValue(undefined);

      await client.addPlugin(mockPlugin);

      expect(client.plugins['testPlugin2']).toBe(mockPlugin);
      expect(startPluginSpy).toHaveBeenCalledWith('testPlugin2');
    });

    it('startPlugin should call plugin.start and register event handlers', async () => {
      const mockPlugin = createMockPlugin('testPlugin3');
      mockPlugin.p2p = { '/test/p2p': vi.fn() };
      mockPlugin.pubsub = { '/test/pubsub': vi.fn() };
      mockPlugin.coreEvents = { '/client/ready': vi.fn() };
      mockPlugin.pluginEvents = { '/custom/event': vi.fn() };

      // Add plugin first so it's in client.plugins
      await client.addPlugin(mockPlugin);

      // Spy on client's own subscribe method
      const clientSubscribeSpy = vi.spyOn(client, 'subscribe').mockResolvedValue(undefined);

      await client.startPlugin('testPlugin3');

      expect(mockPlugin.start).toHaveBeenCalled();
      expect(client.p2p.on).toHaveBeenCalledWith('/test/p2p', expect.any(Function));
      expect(client.pubsub.on).toHaveBeenCalledWith('/test/pubsub', expect.any(Function));
      expect(clientSubscribeSpy).toHaveBeenCalledWith('/test/pubsub');
      // For coreEvents, client itself is the emitter
      expect(client.on).toHaveBeenCalledWith('/client/ready', expect.any(Function));
      expect(client.pluginEvents.on).toHaveBeenCalledWith('/custom/event', expect.any(Function));
    });
  });

  describe('Stop Method', () => {
    it('should call plugin.stop, ipfs.stop, and client.save', async () => {
      const mockPlugin1 = createMockPlugin('stoppablePlugin1');
      const mockPlugin2 = createMockPlugin('stoppablePlugin2');
      await client.addPlugin(mockPlugin1);
      await client.addPlugin(mockPlugin2);

      client.running = true; // stop() only does things if running

      // client.save is already spied on in beforeEach
      // vi.spyOn(client.identity, 'save'); // Already mocked in client constructor via this.identity = new Identity()

      await client.stop();

      expect(mockPlugin1.stop).toHaveBeenCalled();
      expect(mockPlugin2.stop).toHaveBeenCalled();
      expect(mockIpfs.stop).toHaveBeenCalled();
      expect(client.save).toHaveBeenCalled(); // Check the spy on client.save
    });
  });

  describe('Schema Methods', () => {
    const testSchemaObject: SchemaInterface = {
      schemaId: 'testSchemaV1',
      tableName: 'testItems',
      definition: { name: { type: 'string' } },
      indexes: [{ name: 'byName', fields: ['name'] }],
      encrypt: false,
      hasChanges: vi.fn().mockReturnValue(false),
      export: vi.fn().mockResolvedValue({} as any),
    } as unknown as SchemaInterface; // Cast to avoid full mock of SchemaInterface methods

    it('addSchema should add a schema and call client.save', async () => {
      await client.addSchema('testSchema1', testSchemaObject);

      expect(client.schemas['testSchema1']).toBe(testSchemaObject);
      expect(client.save).toHaveBeenCalled();
    });

    it('hasSchema should return true for an added schema and false for non-existent', async () => {
      await client.addSchema('testSchema2', testSchemaObject);

      expect(client.hasSchema('testSchema2')).toBe(true);
      expect(client.hasSchema('nonExistentSchema')).toBe(false);
    });

    it('getSchema should return the schema or throw if non-existent', async () => {
      await client.addSchema('testSchema3', testSchemaObject);

      expect(client.getSchema('testSchema3')).toBe(testSchemaObject);
      expect(() => client.getSchema('nonExistentSchema')).toThrow('schema does not exist: nonExistentSchema');
    });
  });
});
