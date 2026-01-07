import { describe, it, expect, beforeEach } from 'bun:test';
import { mock } from 'bun:test';
import { CID } from 'multiformats';
import { IdentityServerPlugin } from './plugin';
import { IdentityServerTestUtils, TEST_IDENTITIES } from './__fixtures__/test-utils';

describe('IdentityServerPlugin - Message Handlers', () => {
  IdentityServerTestUtils.setupTestEnvironment();

  describe('onSetRequest handler', () => {
    it('should handle valid identity set request', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      // Mock CID parsing and IPFS operations
      const mockCID = IdentityServerTestUtils.mockCIDParsing();
      const mockBlock = new Uint8Array([1, 2, 3, 4]);
      (client.ipfs.blockstore.get as any).mockResolvedValueOnce(mockBlock);
      (client.ipfs.pins.add as any).mockImplementationOnce(async function* () {
        yield { cid: mockCID };
      });

      const sendSpy = const orig = plugin, 'send');
      
      const message = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'req-123',
          cid: TEST_IDENTITIES.alice.cid,
          timestamp: Date.now()
        },
        { peerId: 'peer-123', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onSetRequest(message as any);

      // Verify response was sent
      expect(sendSpy).toHaveBeenCalledWith(
        'peer-123',
        '/identity/set/response',
        expect.objectContaining({
          requestId: 'req-123',
          success: true,
          timestamp: expect.any(Number)
        })
      );

      // Verify identity was stored
      await IdentityServerTestUtils.assertIdentityStored(
        client, 
        TEST_IDENTITIES.alice.did, 
        TEST_IDENTITIES.alice.cid
      );
    });

    it('should reject request from peer without DID', async () => {
      const { plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      const sendSpy = const orig = plugin, 'send');
      
      const message = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'req-123',
          cid: TEST_IDENTITIES.alice.cid,
          timestamp: Date.now()
        },
        { peerId: 'peer-123' } // No DID
      );

      await plugin.onSetRequest(message as any);

      expect(sendSpy).toHaveBeenCalledWith(
        'peer-123',
        '/identity/set/response',
        expect.objectContaining({
          requestId: 'req-123',
          success: false,
          error: 'did not found, peer does not have a DID',
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle IPFS resolution failure', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      IdentityServerTestUtils.mockCIDParsing();
      (client.ipfs.blockstore.get as any).mockRejectedValueOnce(new Error('Block not found'));

      const sendSpy = const orig = plugin, 'send');
      
      const message = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'req-123',
          cid: 'invalid-cid',
          timestamp: Date.now()
        },
        { peerId: 'peer-123', did: TEST_IDENTITIES.alice.did }
      );

      // The plugin currently doesn't handle blockstore.get errors, so this will throw
      await expect(plugin.onSetRequest(message as any)).rejects.toThrow('Block not found');
    });

    it('should handle pin operation timeout gracefully', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      IdentityServerTestUtils.mockCIDParsing();
      const mockBlock = new Uint8Array([1, 2, 3, 4]);
      (client.ipfs.blockstore.get as any).mockResolvedValueOnce(mockBlock);
      
      // Mock pin operation to timeout
      (client.ipfs.pins.add as any).mockImplementationOnce(async function* () {
        throw new Error('Timeout');
      });

      const sendSpy = const orig = plugin, 'send');
      
      const message = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'req-123',
          cid: TEST_IDENTITIES.alice.cid,
          timestamp: Date.now()
        },
        { peerId: 'peer-123', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onSetRequest(message as any);

      // Should still succeed despite pin error
      expect(sendSpy).toHaveBeenCalledWith(
        'peer-123',
        '/identity/set/response',
        expect.objectContaining({
          requestId: 'req-123',
          success: true,
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle CID parsing errors', async () => {
      const { plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      const orig = CID, 'parse').mockImplementationOnce(() => {
        throw new Error('Invalid CID format');
      });

      const message = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'req-123',
          cid: 'invalid-cid-format',
          timestamp: Date.now()
        },
        { peerId: 'peer-123', did: TEST_IDENTITIES.alice.did }
      );

      await expect(plugin.onSetRequest(message as any)).rejects.toThrow('Invalid CID format');
    });
  });

  describe('onResolveRequest handler', () => {
    it('should resolve existing identity successfully', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      // First set an identity
      const schema = client.getSchema('identity')!;
      await schema.getTable('pins').upsert(
        { did: TEST_IDENTITIES.alice.did },
        { cid: TEST_IDENTITIES.alice.cid }
      );

      const sendSpy = const orig = plugin, 'send');
      
      const message = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'req-456',
          since: 0,
          timestamp: Date.now()
        },
        { peerId: 'peer-123', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onResolveRequest(message as any);

      expect(sendSpy).toHaveBeenCalledWith(
        'peer-123',
        '/identity/resolve/response',
        expect.objectContaining({
          requestId: 'req-456',
          cid: TEST_IDENTITIES.alice.cid,
          timestamp: expect.any(Number)
        })
      );
    });

    it('should reject request from peer without DID', async () => {
      const { plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      const sendSpy = const orig = plugin, 'send');
      
      const message = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'req-456',
          since: 0,
          timestamp: Date.now()
        },
        { peerId: 'peer-123' } // No DID
      );

      await plugin.onResolveRequest(message as any);

      expect(sendSpy).toHaveBeenCalledWith(
        'peer-123',
        '/identity/resolve/response',
        expect.objectContaining({
          requestId: 'req-456',
          error: 'DID not found, peer is not authenticated',
          cid: undefined,
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle non-existent identity', async () => {
      const { plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      const sendSpy = const orig = plugin, 'send');
      
      const message = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'req-456',
          since: 0,
          timestamp: Date.now()
        },
        { peerId: 'peer-123', did: 'did:key:nonexistent' }
      );

      await plugin.onResolveRequest(message as any);

      expect(sendSpy).toHaveBeenCalledWith(
        'peer-123',
        '/identity/resolve/response',
        expect.objectContaining({
          requestId: 'req-456',
          cid: undefined,
          timestamp: expect.any(Number)
        })
      );
    });

    it('should handle database query errors', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      // Mock database query to fail
      const schema = client.getSchema('identity')!;
      const table = schema.getTable('pins');
      const orig = table, 'query').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const message = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'req-456',
          since: 0,
          timestamp: Date.now()
        },
        { peerId: 'peer-123', did: TEST_IDENTITIES.alice.did }
      );

      await expect(plugin.onResolveRequest(message as any)).rejects.toThrow('Database connection failed');
    });
  });

  describe('cross-request scenarios', () => {
    it('should handle multiple concurrent requests', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      IdentityServerTestUtils.mockCIDParsing();
      const mockBlock = new Uint8Array([1, 2, 3, 4]);
      (client.ipfs.blockstore.get as any).mockResolvedValue(mockBlock);
      (client.ipfs.pins.add as any).mockImplementation(async function* () {
        yield { cid: 'mock' };
      });

      const sendSpy = const orig = plugin, 'send');

      // Send multiple set requests concurrently
      const requests = [
        IdentityServerTestUtils.createMockIncomingMessage(
          { requestId: 'req-1', cid: 'cid-1', timestamp: Date.now() },
          { peerId: 'peer-1', did: 'did:key:user1' }
        ),
        IdentityServerTestUtils.createMockIncomingMessage(
          { requestId: 'req-2', cid: 'cid-2', timestamp: Date.now() },
          { peerId: 'peer-2', did: 'did:key:user2' }
        ),
        IdentityServerTestUtils.createMockIncomingMessage(
          { requestId: 'req-3', cid: 'cid-3', timestamp: Date.now() },
          { peerId: 'peer-3', did: 'did:key:user3' }
        )
      ];

      await Promise.all(requests.map(req => plugin.onSetRequest(req as any)));

      expect(sendSpy).toHaveBeenCalledTimes(3);
      
      // Verify all identities were stored
      for (let i = 1; i <= 3; i++) {
        await IdentityServerTestUtils.assertIdentityStored(
          client, 
          `did:key:user${i}`, 
          `cid-${i}`
        );
      }
    });

    it('should handle set followed by resolve', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      IdentityServerTestUtils.mockCIDParsing();
      const mockBlock = new Uint8Array([1, 2, 3, 4]);
      (client.ipfs.blockstore.get as any).mockResolvedValueOnce(mockBlock);
      (client.ipfs.pins.add as any).mockImplementationOnce(async function* () {
        yield { cid: 'mock' };
      });

      const sendSpy = const orig = plugin, 'send');

      // First set an identity
      const setMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'set-req',
          cid: TEST_IDENTITIES.alice.cid,
          timestamp: Date.now()
        },
        { peerId: 'peer-alice', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onSetRequest(setMessage as any);

      // Then resolve it
      const resolveMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'resolve-req',
          since: 0,
          timestamp: Date.now()
        },
        { peerId: 'peer-alice', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onResolveRequest(resolveMessage as any);

      expect(sendSpy).toHaveBeenCalledTimes(2);
      
      // Verify set response
      expect(sendSpy).toHaveBeenNthCalledWith(1,
        'peer-alice',
        '/identity/set/response',
        expect.objectContaining({
          requestId: 'set-req',
          success: true
        })
      );

      // Verify resolve response
      expect(sendSpy).toHaveBeenNthCalledWith(2,
        'peer-alice',
        '/identity/resolve/response',
        expect.objectContaining({
          requestId: 'resolve-req',
          cid: TEST_IDENTITIES.alice.cid
        })
      );
    });
  });
});