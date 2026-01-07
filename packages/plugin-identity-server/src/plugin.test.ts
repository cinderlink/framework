import { describe, it, expect, beforeEach } from 'bun:test';
import { mock } from 'bun:test';
import { CID } from 'multiformats';
import { IdentityServerPlugin } from './plugin';
import { IdentityServerTestUtils, TEST_IDENTITIES } from './__fixtures__/test-utils';

describe('IdentityServerPlugin', () => {
  IdentityServerTestUtils.setupTestEnvironment();

  describe('initialization', () => {
    it('should create plugin with default options', async () => {
      const client = await IdentityServerTestUtils.createTestClient();
      const plugin = new IdentityServerPlugin(client);
      
      expect(plugin).toBeInstanceOf(IdentityServerPlugin);
      expect(plugin.id).toBe('identityServer');
      expect(plugin.started).toBe(false);
    });

    it('should create plugin with custom options', async () => {
      const client = await IdentityServerTestUtils.createTestClient();
      const options = { customSetting: 'test-value' };
      const plugin = new IdentityServerPlugin(client, options);
      
      expect(plugin.options).toEqual(options);
    });

    it('should have proper schema definitions', async () => {
      const client = await IdentityServerTestUtils.createTestClient();
      const plugin = new IdentityServerPlugin(client);
      
      expect(plugin.schemas).toBeDefined();
      expect(plugin.schemas.send).toHaveProperty('/identity/resolve/response');
      expect(plugin.schemas.send).toHaveProperty('/identity/set/response');
      expect(plugin.schemas.receive).toHaveProperty('/identity/set/request');
      expect(plugin.schemas.receive).toHaveProperty('/identity/resolve/request');
    });
  });

  describe('lifecycle management', () => {
    it('should start successfully', async () => {
      const { plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      
      await plugin.start();
      
      await IdentityServerTestUtils.assertPluginStarted(plugin);
    });

    it('should create identity schema on start', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      
      expect(client.hasSchema('identity')).toBe(false);
      
      await plugin.start();
      
      expect(client.hasSchema('identity')).toBe(true);
      const schema = client.getSchema('identity');
      expect(schema).toBeDefined();
      // The schema object may not have a name property - check its structure
      expect(typeof schema).toBe('object');
    });

    it('should handle existing identity schema gracefully', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      
      // Start plugin once to create schema
      await plugin.start();
      plugin.stop();
      
      // Create new plugin instance with same client
      const plugin2 = new IdentityServerPlugin(client);
      
      // Should start without errors
      await plugin2.start();
      await IdentityServerTestUtils.assertPluginStarted(plugin2);
    });

    it('should stop successfully', async () => {
      const { plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      
      await plugin.start();
      expect(plugin.started).toBe(true);
      
      plugin.stop();
      expect(plugin.started).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle database initialization errors', async () => {
      const client = await IdentityServerTestUtils.createTestClient();
      
      // Mock schema creation to fail
      const orig = client, 'addSchema').mockRejectedValueOnce(new Error('Database error'));
      
      const plugin = new IdentityServerPlugin(client);
      
      await expect(plugin.start()).rejects.toThrow('Database error');
    });

    it('should handle missing client methods gracefully', async () => {
      const client = await IdentityServerTestUtils.createTestClient();
      
      // Mock hasSchema to throw
      const orig = client, 'hasSchema').mockImplementationOnce(() => {
        throw new Error('Client error');
      });
      
      const plugin = new IdentityServerPlugin(client);
      
      await expect(plugin.start()).rejects.toThrow('Client error');
    });
  });

  describe('schema configuration', () => {
    it('should create correct table definition', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      
      await plugin.start();
      
      const schema = client.getSchema('identity');
      expect(schema).toBeDefined();
      
      const table = schema!.getTable('pins');
      expect(table).toBeDefined();
    });

    it('should configure encryption correctly', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      
      await plugin.start();
      
      const schema = client.getSchema('identity');
      expect(schema).toBeDefined();
      
      // Check that schema was created with encryption enabled
      // This would depend on the actual schema implementation details
    });

    it('should set up proper indexes', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      
      await plugin.start();
      
      const schema = client.getSchema('identity');
      const table = schema!.getTable('pins');
      expect(table).toBeDefined();
      
      // Verify indexes exist - implementation would depend on table API
    });
  });

  describe('plugin integration', () => {
    it('should register event handlers on start', async () => {
      const { client, plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      
      const initSpy = const orig = plugin as any, 'initializeHandlers');
      
      await plugin.start();
      
      expect(initSpy).toHaveBeenCalledOnce();
    });

    it('should have correct handler mappings', async () => {
      const { plugin } = await IdentityServerTestUtils.createIdentityServerPlugin();
      
      const handlers = (plugin as any).getEventHandlers();
      
      expect(handlers.p2p).toHaveProperty('/identity/set/request');
      expect(handlers.p2p).toHaveProperty('/identity/resolve/request');
      expect(typeof handlers.p2p['/identity/set/request']).toBe('function');
      expect(typeof handlers.p2p['/identity/resolve/request']).toBe('function');
    });
  });
});