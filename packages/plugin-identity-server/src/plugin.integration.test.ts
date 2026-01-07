import { describe, it, expect } from 'bun:test';
import { mock } from 'bun:test';
import { IdentityServerPlugin } from './plugin';
import { IdentityServerTestUtils, TEST_IDENTITIES } from './__fixtures__/test-utils';

describe('IdentityServerPlugin - Integration Tests', () => {
  IdentityServerTestUtils.setupTestEnvironment();

  describe('complete identity workflow', () => {
    it('should handle full set and resolve cycle', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      // Mock IPFS operations
      IdentityServerTestUtils.mockCIDParsing();
      const mockBlock = new Uint8Array([1, 2, 3, 4]);
      (client.ipfs.blockstore.get as any).mockResolvedValue(mockBlock);
      (client.ipfs.pins.add as any).mockImplementation(async function* () {
        yield { cid: 'mock' };
      });

      const sendSpy = const orig = plugin, 'send');

      // Step 1: Set identity
      const setMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'workflow-set',
          cid: TEST_IDENTITIES.alice.cid,
          timestamp: Date.now()
        },
        { peerId: 'alice-peer', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onSetRequest(setMessage as any);

      // Step 2: Resolve identity
      const resolveMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'workflow-resolve',
          since: 0,
          timestamp: Date.now()
        },
        { peerId: 'alice-peer', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onResolveRequest(resolveMessage as any);

      // Verify both operations succeeded
      expect(sendSpy).toHaveBeenCalledTimes(2);
      
      expect(sendSpy).toHaveBeenNthCalledWith(1,
        'alice-peer',
        '/identity/set/response',
        expect.objectContaining({
          requestId: 'workflow-set',
          success: true
        })
      );

      expect(sendSpy).toHaveBeenNthCalledWith(2,
        'alice-peer',
        '/identity/resolve/response',
        expect.objectContaining({
          requestId: 'workflow-resolve',
          cid: TEST_IDENTITIES.alice.cid
        })
      );
    });

    it('should handle multiple users simultaneously', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      // Mock IPFS operations
      IdentityServerTestUtils.mockCIDParsing();
      const mockBlock = new Uint8Array([1, 2, 3, 4]);
      (client.ipfs.blockstore.get as any).mockResolvedValue(mockBlock);
      (client.ipfs.pins.add as any).mockImplementation(async function* () {
        yield { cid: 'mock' };
      });

      const sendSpy = const orig = plugin, 'send');

      // Set identities for multiple users
      const users = [TEST_IDENTITIES.alice, TEST_IDENTITIES.bob, TEST_IDENTITIES.charlie];
      
      // Concurrent set operations
      const setPromises = users.map((user, index) => {
        const message = IdentityServerTestUtils.createMockIncomingMessage(
          {
            requestId: `set-${user.did}`,
            cid: user.cid,
            timestamp: Date.now()
          },
          { peerId: `peer-${index}`, did: user.did }
        );
        return plugin.onSetRequest(message as any);
      });

      await Promise.all(setPromises);

      // Concurrent resolve operations
      const resolvePromises = users.map((user, index) => {
        const message = IdentityServerTestUtils.createMockIncomingMessage(
          {
            requestId: `resolve-${user.did}`,
            since: 0,
            timestamp: Date.now()
          },
          { peerId: `peer-${index}`, did: user.did }
        );
        return plugin.onResolveRequest(message as any);
      });

      await Promise.all(resolvePromises);

      // Verify all operations completed
      expect(sendSpy).toHaveBeenCalledTimes(6); // 3 sets + 3 resolves

      // Verify each user can resolve their own identity
      for (let i = 0; i < users.length; i++) {
        await IdentityServerTestUtils.assertIdentityStored(
          client,
          users[i].did,
          users[i].cid
        );
      }
    });

    it('should handle identity updates', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      // Mock IPFS operations
      IdentityServerTestUtils.mockCIDParsing();
      const mockBlock = new Uint8Array([1, 2, 3, 4]);
      (client.ipfs.blockstore.get as any).mockResolvedValue(mockBlock);
      (client.ipfs.pins.add as any).mockImplementation(async function* () {
        yield { cid: 'mock' };
      });

      const sendSpy = const orig = plugin, 'send');

      // Initial identity set
      const initialSetMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'initial-set',
          cid: TEST_IDENTITIES.alice.cid,
          timestamp: Date.now()
        },
        { peerId: 'alice-peer', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onSetRequest(initialSetMessage as any);

      // Updated identity set
      const updatedCid = 'bafkreiupdatedcid123';
      const updateSetMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'update-set',
          cid: updatedCid,
          timestamp: Date.now()
        },
        { peerId: 'alice-peer', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onSetRequest(updateSetMessage as any);

      // Resolve to check update
      const resolveMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'resolve-updated',
          since: 0,
          timestamp: Date.now()
        },
        { peerId: 'alice-peer', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onResolveRequest(resolveMessage as any);

      // Verify update worked
      expect(sendSpy).toHaveBeenCalledTimes(3);
      
      expect(sendSpy).toHaveBeenNthCalledWith(3,
        'alice-peer',
        '/identity/resolve/response',
        expect.objectContaining({
          requestId: 'resolve-updated',
          cid: updatedCid
        })
      );

      await IdentityServerTestUtils.assertIdentityStored(
        client,
        TEST_IDENTITIES.alice.did,
        updatedCid
      );
    });
  });

  describe('error recovery scenarios', () => {
    it('should recover from temporary IPFS failures', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      IdentityServerTestUtils.mockCIDParsing();
      const sendSpy = const orig = plugin, 'send');

      // First request fails
      (client.ipfs.blockstore.get as any).mockRejectedValueOnce(new Error('IPFS timeout'));

      const failMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'fail-request',
          cid: TEST_IDENTITIES.alice.cid,
          timestamp: Date.now()
        },
        { peerId: 'alice-peer', did: TEST_IDENTITIES.alice.did }
      );

      // The plugin currently doesn't handle blockstore.get errors, so this will throw
      await expect(plugin.onSetRequest(failMessage as any)).rejects.toThrow('IPFS timeout');

      // Second request succeeds
      const mockBlock = new Uint8Array([1, 2, 3, 4]);
      (client.ipfs.blockstore.get as any).mockResolvedValueOnce(mockBlock);
      (client.ipfs.pins.add as any).mockImplementationOnce(async function* () {
        yield { cid: 'mock' };
      });

      const successMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'success-request',
          cid: TEST_IDENTITIES.alice.cid,
          timestamp: Date.now()
        },
        { peerId: 'alice-peer', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onSetRequest(successMessage as any);

      // Verify the success case worked
      expect(sendSpy).toHaveBeenCalledTimes(1);
      
      expect(sendSpy).toHaveBeenNthCalledWith(1,
        'alice-peer',
        '/identity/set/response',
        expect.objectContaining({
          requestId: 'success-request',
          success: true
        })
      );
    });

    it('should handle database consistency after restart', async () => {
      let { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      
      // Start plugin and set identity
      await plugin.start();

      // Mock successful identity storage
      IdentityServerTestUtils.mockCIDParsing();
      const mockBlock = new Uint8Array([1, 2, 3, 4]);
      (client.ipfs.blockstore.get as any).mockResolvedValue(mockBlock);
      (client.ipfs.pins.add as any).mockImplementation(async function* () {
        yield { cid: 'mock' };
      });

      const setMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'pre-restart-set',
          cid: TEST_IDENTITIES.alice.cid,
          timestamp: Date.now()
        },
        { peerId: 'alice-peer', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onSetRequest(setMessage as any);

      // Simulate restart
      plugin.stop();
      plugin = new IdentityServerPlugin(client);
      await plugin.start();

      const sendSpy = const orig = plugin, 'send');

      // Resolve after restart should still work
      const resolveMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'post-restart-resolve',
          since: 0,
          timestamp: Date.now()
        },
        { peerId: 'alice-peer', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onResolveRequest(resolveMessage as any);

      expect(sendSpy).toHaveBeenCalledWith(
        'alice-peer',
        '/identity/resolve/response',
        expect.objectContaining({
          requestId: 'post-restart-resolve',
          cid: TEST_IDENTITIES.alice.cid
        })
      );
    });
  });

  describe('security scenarios', () => {
    it('should prevent unauthorized identity modifications', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      // Mock IPFS operations
      IdentityServerTestUtils.mockCIDParsing();
      const mockBlock = new Uint8Array([1, 2, 3, 4]);
      (client.ipfs.blockstore.get as any).mockResolvedValue(mockBlock);
      (client.ipfs.pins.add as any).mockImplementation(async function* () {
        yield { cid: 'mock' };
      });

      const sendSpy = const orig = plugin, 'send');

      // Alice sets her identity
      const aliceSetMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'alice-set',
          cid: TEST_IDENTITIES.alice.cid,
          timestamp: Date.now()
        },
        { peerId: 'alice-peer', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onSetRequest(aliceSetMessage as any);

      // Bob tries to modify Alice's identity (should fail)
      const bobAttackMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'bob-attack',
          cid: 'malicious-cid',
          timestamp: Date.now()
        },
        { peerId: 'bob-peer', did: TEST_IDENTITIES.bob.did }
      );

      await plugin.onSetRequest(bobAttackMessage as any);

      // Verify Alice's identity is unchanged
      const resolveMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'verify-alice',
          since: 0,
          timestamp: Date.now()
        },
        { peerId: 'alice-peer', did: TEST_IDENTITIES.alice.did }
      );

      await plugin.onResolveRequest(resolveMessage as any);

      expect(sendSpy).toHaveBeenCalledTimes(3);
      
      // Alice's identity should be unchanged
      expect(sendSpy).toHaveBeenNthCalledWith(3,
        'alice-peer',
        '/identity/resolve/response',
        expect.objectContaining({
          requestId: 'verify-alice',
          cid: TEST_IDENTITIES.alice.cid
        })
      );

      // Verify Bob created his own record, not modified Alice's
      await IdentityServerTestUtils.assertIdentityStored(
        client,
        TEST_IDENTITIES.alice.did,
        TEST_IDENTITIES.alice.cid
      );
      
      await IdentityServerTestUtils.assertIdentityStored(
        client,
        TEST_IDENTITIES.bob.did,
        'malicious-cid'
      );
    });

    it('should handle requests from peers without authentication', async () => {
      const { plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      const sendSpy = const orig = plugin, 'send');

      // Unauthenticated set request
      const unauthSetMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'unauth-set',
          cid: 'some-cid',
          timestamp: Date.now()
        },
        { peerId: 'unauth-peer' } // No DID
      );

      await plugin.onSetRequest(unauthSetMessage as any);

      // Unauthenticated resolve request
      const unauthResolveMessage = IdentityServerTestUtils.createMockIncomingMessage(
        {
          requestId: 'unauth-resolve',
          since: 0,
          timestamp: Date.now()
        },
        { peerId: 'unauth-peer' } // No DID
      );

      await plugin.onResolveRequest(unauthResolveMessage as any);

      expect(sendSpy).toHaveBeenCalledTimes(2);
      
      // Both should reject with authentication errors
      expect(sendSpy).toHaveBeenNthCalledWith(1,
        'unauth-peer',
        '/identity/set/response',
        expect.objectContaining({
          requestId: 'unauth-set',
          success: false,
          error: expect.stringContaining('DID')
        })
      );

      expect(sendSpy).toHaveBeenNthCalledWith(2,
        'unauth-peer',
        '/identity/resolve/response',
        expect.objectContaining({
          requestId: 'unauth-resolve',
          error: expect.stringContaining('DID')
        })
      );
    });
  });

  describe('performance scenarios', () => {
    it('should handle high request volume', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      await plugin.start();

      // Mock IPFS operations
      IdentityServerTestUtils.mockCIDParsing();
      const mockBlock = new Uint8Array([1, 2, 3, 4]);
      (client.ipfs.blockstore.get as any).mockResolvedValue(mockBlock);
      (client.ipfs.pins.add as any).mockImplementation(async function* () {
        yield { cid: 'mock' };
      });

      const sendSpy = const orig = plugin, 'send');

      // Generate many concurrent requests
      const requestCount = 50;
      const requests = Array.from({ length: requestCount }, (_, i) => {
        return IdentityServerTestUtils.createMockIncomingMessage(
          {
            requestId: `batch-req-${i}`,
            cid: `cid-${i}`,
            timestamp: Date.now()
          },
          { peerId: `peer-${i}`, did: `did:key:user${i}` }
        );
      });

      const startTime = Date.now();
      
      // Execute all requests concurrently
      await Promise.all(requests.map(req => plugin.onSetRequest(req as any)));
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(sendSpy).toHaveBeenCalledTimes(requestCount);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all identities were stored
      for (let i = 0; i < 10; i++) { // Check first 10
        await IdentityServerTestUtils.assertIdentityStored(
          client,
          `did:key:user${i}`,
          `cid-${i}`
        );
      }
    });
  });
});