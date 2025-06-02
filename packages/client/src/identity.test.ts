// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll as vitestAfterAll } from 'vitest';
import { CID } from 'multiformats/cid';
import localforage from 'localforage';
import { Identity } from './identity';
import {
  CinderlinkClientInterface,
  PluginEventDef,
  LoggerInterface,
  IdentityDocument,
  IdentityResolved,
  Peer,
  CinderlinkClientEvents // For client.request
} from '@cinderlink/core-types'; // Adjust path as needed
import { PeerId } from '@libp2p/interface/peer-id'; // For mocking client.peerId type

// Mock localforage
vi.mock('localforage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(), // Though not directly used by code under test, good for completeness
    clear: vi.fn(),
  }
}));

// Mock Logger
const mockLoggerInstance: Partial<LoggerInterface> = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  module: vi.fn(() => mockLoggerInstance as LoggerInterface),
  submodule: vi.fn(() => mockLoggerInstance as LoggerInterface),
};

// Helper to create a mock PeerId
const createMockPeerId = (idString: string): PeerId => ({
  toString: () => idString,
  equals: (other: any) => other?.toString() === idString,
  toBytes: () => new Uint8Array(Buffer.from(idString)), // Simplified
  // Add other methods/properties if needed by the code, though often toString is enough for mocks
}) as PeerId;


describe('Identity', () => {
  let identity: Identity<PluginEventDef>;
  let mockClient: CinderlinkClientInterface<PluginEventDef>;

  // --- Mock CIDs and Documents ---
  // Using known valid CID structures. Content doesn't matter as loadDecrypted is mocked.
  const validCid1 = 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku';
  const validCid2 = 'bafkreicrarf34vqavdiq3yr27k3gtbrtmpk4dtkchxlmzabdprbubh277m';
  const validCid3 = 'bafkreifzwtzftx32glnpbk2nlapb77vggavvzl665zshkbhukpqsdvjgpu';

  const localCIDString = validCid1;
  const localDoc: IdentityDocument = { schemas: { profile: 'localcid' }, updatedAt: 100 };

  const ipnsCIDString = validCid2;
  const ipnsDoc: IdentityDocument = { schemas: { profile: 'ipnscid' }, updatedAt: 200 };

  const serverCIDString = validCid3;
  const serverDoc: IdentityDocument = { schemas: { profile: 'servercid' }, updatedAt: 300 };
  const serverPeerIdString = '12D3KooWSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const mockServerPeer: Peer = { peerId: createMockPeerId(serverPeerIdString), did: 'did:key:zserver' };


  beforeEach(() => {
    // Reset all mocks defined on mockClient or its properties before each test
    vi.resetAllMocks(); // Resets vi.fn mocks etc.

    // Re-initialize mocks for localforage as vi.mock creates a hoisted, shared mock.
    (localforage.getItem as ReturnType<typeof vi.fn>).mockReset();
    (localforage.setItem as ReturnType<typeof vi.fn>).mockReset();

    mockClient = {
      logger: mockLoggerInstance as LoggerInterface,
      peerId: createMockPeerId('12D3KooWClientTestPeerIdxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
      did: { id: "did:mock:clienttestid" } as any,
      dag: {
        loadDecrypted: vi.fn(),
        storeEncrypted: vi.fn(),
      },
      ipfs: {
        pins: {
          add: vi.fn().mockImplementation(async function*() { yield 'mock-pin-add'; }),
          rm: vi.fn().mockImplementation(async function*() { yield 'mock-pin-rm'; }),
        },
        libp2p: {
          services: {
            ipns: {
              resolve: vi.fn(),
              publish: vi.fn(),
            },
          },
        },
      } as any,
      peers: {
        getServers: vi.fn().mockReturnValue([]), // Default to empty array
      },
      request: vi.fn(),
      send: vi.fn(),
      emit: vi.fn(),
      publish: vi.fn(), // For potential IPNS publishing via client abstraction
      // Add any other methods/properties of CinderlinkClientInterface used by Identity
    } as unknown as CinderlinkClientInterface<PluginEventDef>; // Cast to avoid full mock initially

    identity = new Identity(mockClient);
    identity.hasResolved = false; // Ensure this starts false for resolve tests
    identity.cid = undefined;
    identity.document = undefined;
    identity.resolving = undefined; // Clear any pending resolve promises
  });

  vitestAfterAll(() => {
    vi.restoreAllMocks(); // Clean up mocks after all tests in the suite
  });

  describe('resolve', () => {
    it('should return empty result if no data exists anywhere', async () => {
      (localforage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockClient.ipfs.libp2p!.services!.ipns!.resolve as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("IPNS not found"));
      (mockClient.peers.getServers as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const result = await identity.resolve();

      expect(result.cid).toBeUndefined();
      expect(result.document).toBeUndefined();
      expect(identity.cid).toBeUndefined();
      expect(identity.document).toBeUndefined();
      expect(mockClient.emit).toHaveBeenCalledWith("/identity/resolved", { cid: undefined, document: undefined });
    });

    it('should resolve from localforage if only local data exists', async () => {
      (localforage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(localCIDString);
      (mockClient.dag.loadDecrypted as ReturnType<typeof vi.fn>).mockImplementation(async (cidArg) => {
        if (cidArg.toString() === localCIDString) return localDoc;
        return undefined;
      });
      (mockClient.ipfs.libp2p!.services!.ipns!.resolve as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("IPNS not found"));
      (mockClient.peers.getServers as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const result = await identity.resolve();

      expect(result.cid).toBe(localCIDString);
      expect(result.document).toEqual(localDoc);
      expect(mockClient.dag.loadDecrypted).toHaveBeenCalledWith(CID.parse(localCIDString), undefined, { timeout: 3000 });
      expect(mockClient.emit).toHaveBeenCalledWith("/identity/resolved", { cid: localCIDString, document: localDoc });
    });

    it('should resolve from IPNS if only IPNS data exists', async () => {
      (localforage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockClient.ipfs.libp2p!.services!.ipns!.resolve as ReturnType<typeof vi.fn>)
        .mockResolvedValue(`/ipfs/${ipnsCIDString}`);
      (mockClient.dag.loadDecrypted as ReturnType<typeof vi.fn>).mockImplementation(async (cidArg) => {
        if (cidArg.toString() === ipnsCIDString) return ipnsDoc;
        return undefined;
      });
      (mockClient.peers.getServers as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const result = await identity.resolve();

      expect(result.cid).toBe(ipnsCIDString);
      expect(result.document).toEqual(ipnsDoc);
      expect(mockClient.ipfs.libp2p!.services!.ipns!.resolve).toHaveBeenCalledWith(mockClient.peerId);
      expect(mockClient.dag.loadDecrypted).toHaveBeenCalledWith(CID.parse(ipnsCIDString), undefined, { timeout: 3000 });
      expect(mockClient.emit).toHaveBeenCalledWith("/identity/resolved", { cid: ipnsCIDString, document: ipnsDoc });
    });

    it('should resolve from server if only server data exists', async () => {
      (localforage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockClient.ipfs.libp2p!.services!.ipns!.resolve as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("IPNS not found"));
      (mockClient.peers.getServers as ReturnType<typeof vi.fn>).mockReturnValue([mockServerPeer]);
      (mockClient.request as ReturnType<typeof vi.fn>).mockImplementation(async (peerIdStr, request) => {
        if (peerIdStr === serverPeerIdString && request.topic === "/identity/resolve/request") {
          return { payload: { cid: serverCIDString, document: serverDoc } }; // Server directly returns doc for simplicity here
                                                                            // but code implies it returns {cid, document: partial_or_full_doc}
                                                                            // and then client.dag.loadDecrypted is used.
                                                                            // Let's adjust: server returns {cid}, client loads.
        }
        return undefined;
      });
      // Adjusting based on source: server request returns just { cid }, then client.dag.loadDecrypted is called
      (mockClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({ payload: { cid: serverCIDString } });
      (mockClient.dag.loadDecrypted as ReturnType<typeof vi.fn>).mockImplementation(async (cidArg) => {
        if (cidArg.toString() === serverCIDString) return serverDoc;
        return undefined;
      });


      const result = await identity.resolve();

      expect(result.cid).toBe(serverCIDString);
      expect(result.document).toEqual(serverDoc);
      expect(mockClient.peers.getServers).toHaveBeenCalled();
      expect(mockClient.request).toHaveBeenCalledWith(
        serverPeerIdString,
        expect.objectContaining({ topic: "/identity/resolve/request" })
      );
      expect(mockClient.dag.loadDecrypted).toHaveBeenCalledWith(serverCIDString, undefined, { timeout: 5000 });
      expect(mockClient.emit).toHaveBeenCalledWith("/identity/resolved", { cid: serverCIDString, document: serverDoc });
    });

    it('should resolve the latest data if present in multiple locations (server latest)', async () => {
      (localforage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(localCIDString); // updatedAt: 100
      (mockClient.ipfs.libp2p!.services!.ipns!.resolve as ReturnType<typeof vi.fn>)
        .mockResolvedValue(`/ipfs/${ipnsCIDString}`); // updatedAt: 200
      (mockClient.peers.getServers as ReturnType<typeof vi.fn>).mockReturnValue([mockServerPeer]);
      (mockClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({ payload: { cid: serverCIDString } }); // for serverDoc, updatedAt: 300

      (mockClient.dag.loadDecrypted as ReturnType<typeof vi.fn>).mockImplementation(async (cidArg) => {
        if (cidArg.toString() === localCIDString) return localDoc;
        if (cidArg.toString() === ipnsCIDString) return ipnsDoc;
        if (cidArg.toString() === serverCIDString) return serverDoc; // server is latest
        return undefined;
      });

      const result = await identity.resolve();
      expect(result.cid).toBe(serverCIDString);
      expect(result.document).toEqual(serverDoc);
    });

    it('should resolve the latest data if present in multiple locations (IPNS latest)', async () => {
      const ipnsLatestDoc = { ...ipnsDoc, updatedAt: 400 };
      (localforage.getItem as ReturnType<typeof vi.fn>).mockResolvedValue(localCIDString); // updatedAt: 100
      (mockClient.ipfs.libp2p!.services!.ipns!.resolve as ReturnType<typeof vi.fn>)
        .mockResolvedValue(`/ipfs/${ipnsCIDString}`);
      (mockClient.peers.getServers as ReturnType<typeof vi.fn>).mockReturnValue([mockServerPeer]);
      (mockClient.request as ReturnType<typeof vi.fn>).mockResolvedValue({ payload: { cid: serverCIDString } }); // for serverDoc, updatedAt: 300

      (mockClient.dag.loadDecrypted as ReturnType<typeof vi.fn>).mockImplementation(async (cidArg) => {
        if (cidArg.toString() === localCIDString) return localDoc;
        if (cidArg.toString() === ipnsCIDString) return ipnsLatestDoc; // IPNS is latest
        if (cidArg.toString() === serverCIDString) return serverDoc;
        return undefined;
      });

      const result = await identity.resolve();
      expect(result.cid).toBe(ipnsCIDString);
      expect(result.document).toEqual(ipnsLatestDoc);
    });
  });

  describe('save and _save', () => {
    const newDocData = { profile: { name: "Test User" }, schemas: {}, updatedAt: Date.now() };
    // Using a known valid CID structure. This represents an empty file, but is structurally valid.
    const newCID = CID.parse('bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku');

    beforeEach(() => {
      // Ensure identity is "resolved" before save tests
      identity.hasResolved = true;
      identity.cid = 'bafkreiolddddddddddddddddddddddddddddddddddddddddd'; // Some old CID
      identity.document = { schemas: {}, updatedAt: Date.now() - 20000 };
      identity.lastSavedAt = Date.now() - 20000; // Ensure can save to remote
    });

    it('_save should store encrypted, update localforage, pin, and send to servers', async () => {
      (mockClient.dag.storeEncrypted as ReturnType<typeof vi.fn>).mockResolvedValue(newCID); // This mock was missing from client setup for save
      // For _save, we call it directly, so no debounce.

      // Re-assign storeEncrypted for this specific test context as it's part of mockClient
      mockClient.dag.storeEncrypted = vi.fn().mockResolvedValue(newCID);
      (mockClient.peers.getServers as ReturnType<typeof vi.fn>).mockReturnValue([mockServerPeer]);


      await identity._save({ cid: newCID, document: newDocData, forceRemote: true });

      // No, _save does not call storeEncrypted. It receives the CID.
      // The caller of _save (or save) is responsible for encrypting and getting the CID.
      // So, we don't check storeEncrypted here.

      expect(localforage.setItem).toHaveBeenCalledWith("rootCID", newCID);
      expect(mockClient.ipfs.pins.add).toHaveBeenCalledWith(newCID, { signal: expect.any(AbortSignal) });
      // The value of this.cid *before* it's updated in _save
      expect(mockClient.ipfs.pins.rm).toHaveBeenCalledWith('bafkreiolddddddddddddddddddddddddddddddddddddddddd');


      expect(mockClient.send).toHaveBeenCalledWith(
        serverPeerIdString,
        expect.objectContaining({
          topic: "/identity/set/request",
          payload: expect.objectContaining({ cid: newCID.toString() }),
        })
      );
      expect(identity.cid).toBe(newCID.toString());
      expect(identity.document).toEqual(newDocData);
    });

    it('save should debounce calls to _save', async () => {
      vi.useFakeTimers();
      const mock_Save = vi.spyOn(identity, '_save');

      // Call save multiple times
      identity.save({ cid: newCID, document: newDocData });
      identity.save({ cid: newCID, document: { ...newDocData, updatedAt: Date.now() + 1 } });
      identity.save({ cid: newCID, document: { ...newDocData, updatedAt: Date.now() + 2 } });

      expect(mock_Save).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000); // Advance halfway through debounce
      expect(mock_Save).not.toHaveBeenCalled();

      vi.advanceTimersByTime(5000); // Advance past debounce
      expect(mock_Save).toHaveBeenCalledTimes(1);
      // It should be called with the arguments from the *last* call to save.
      expect(mock_Save).toHaveBeenCalledWith(expect.objectContaining({ document: { ...newDocData, updatedAt: expect.any(Number) } }));

      vi.useRealTimers();
      mock_Save.mockRestore();
    });

    it('save should call _save immediately if forceImmediate is true', async () => {
      const mock_Save = vi.spyOn(identity, '_save');

      identity.save({ cid: newCID, document: newDocData, forceImmediate: true });

      expect(mock_Save).toHaveBeenCalledTimes(1);
      expect(mock_Save).toHaveBeenCalledWith({ cid: newCID, document: newDocData, forceRemote: undefined }); // forceRemote would be undefined

      mock_Save.mockRestore();
    });

    it('_save should not send to server if not forceRemote and lastSavedAt is recent', async () => {
      identity.lastSavedAt = Date.now() - 5000; // Saved 5 seconds ago (less than 10s)
      (mockClient.peers.getServers as ReturnType<typeof vi.fn>).mockReturnValue([mockServerPeer]);

      await identity._save({ cid: newCID, document: newDocData, forceRemote: false }); // forceRemote is false

      expect(mockClient.send).not.toHaveBeenCalled();
    });

    it('_save should send to server if not forceRemote but lastSavedAt is old', async () => {
      identity.lastSavedAt = Date.now() - 15000; // Saved 15 seconds ago (more than 10s)
      (mockClient.peers.getServers as ReturnType<typeof vi.fn>).mockReturnValue([mockServerPeer]);

      await identity._save({ cid: newCID, document: newDocData, forceRemote: false });

      expect(mockClient.send).toHaveBeenCalled();
    });

  });
});
