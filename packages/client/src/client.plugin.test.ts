import { describe, it, expect, beforeEach, afterEach} from 'bun:test';

import { ClientTestUtils } from "./__fixtures__/test-utils";
import { 
  EchoPlugin, 
  PubSubTestPlugin, 
  FailingPlugin, 
  StateTrackingPlugin 
} from "./__fixtures__/test-plugins";
import { TestDataGenerators } from "@cinderlink/test-adapters";
import type {
  PluginEventDef,
  PluginInterface,
} from "@cinderlink/core-types";

describe("CinderlinkClient Plugin System", () => {
  ClientTestUtils.setupTestEnvironment();
  
  describe("addPlugin()", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should add and start plugin successfully", async () => {
      const plugin = new EchoPlugin(client);
      
      expect(plugin.started).toBe(false);
      expect(client.hasPlugin(plugin.id)).toBe(false);
      
      await client.addPlugin(plugin);
      
      expect(plugin.started).toBe(true);
      expect(client.hasPlugin(plugin.id)).toBe(true);
      expect(plugin.startCalled).toHaveBeenCalled();
    });
    
    it("should register plugin event handlers", async () => {
      const plugin = new EchoPlugin(client);
      
      // Mock event registration methods
      const mockP2pOn = vi.fn();
      const mockPubsubOn = vi.fn();
      client.p2p.on = mockP2pOn;
      client.pubsub.on = mockPubsubOn;
      
      await client.addPlugin(plugin);
      
      // Should register P2P handlers
      expect(mockP2pOn).toHaveBeenCalledWith("/echo/request", expect.any(Function));
      
      // Should register any pubsub handlers if they exist
      Object.keys(plugin.pubsub).forEach(topic => {
        expect(mockPubsubOn).toHaveBeenCalledWith(topic, expect.any(Function));
      });
    });
    
    it("should register core event handlers", async () => {
      const plugin = new StateTrackingPlugin(client);
      
      const mockCoreOn = vi.fn();
      client.on = mockCoreOn;
      
      await client.addPlugin(plugin);
      
      // Should register core event handlers
      expect(mockCoreOn).toHaveBeenCalledWith("/client/ready", expect.any(Function));
      expect(mockCoreOn).toHaveBeenCalledWith("/peer/connect", expect.any(Function));
      expect(mockCoreOn).toHaveBeenCalledWith("/peer/disconnect", expect.any(Function));
      expect(mockCoreOn).toHaveBeenCalledWith("/server/connect", expect.any(Function));
    });
    
    it("should register plugin event handlers", async () => {
      const plugin = TestDataGenerators.generatePlugin({ 
        id: "test-plugin-events",
        hasP2PHandlers: false,
        hasPubSubHandlers: false 
      });
      
      // Add plugin events
      plugin.pluginEvents = {
        "custom.event": async function() {}
      };
      
      const mockPluginOn = vi.fn();
      client.pluginEvents.on = mockPluginOn;
      
      await client.addPlugin(plugin);
      
      expect(mockPluginOn).toHaveBeenCalledWith("custom.event", expect.any(Function));
    });
    
    it("should handle plugin initialization failure", async () => {
      const failingPlugin = new FailingPlugin(client, { failOnStart: true });
      
      await expect(client.addPlugin(failingPlugin)).rejects.toThrow("Plugin failed to start");
      
      // Plugin should not be added to client on failure
      expect(client.hasPlugin(failingPlugin.id)).toBe(false);
      expect(failingPlugin.started).toBe(false);
    });
    
    it("should prevent duplicate plugins", async () => {
      const plugin1 = new EchoPlugin(client);
      const plugin2 = new EchoPlugin(client);
      
      await client.addPlugin(plugin1);
      
      // Adding second plugin with same ID should replace the first
      await client.addPlugin(plugin2);
      
      expect(client.hasPlugin(plugin1.id)).toBe(true);
      expect(client.getPlugin(plugin1.id)).toBe(plugin2); // Should be the second plugin
    });
    
    it("should set plugin logger", async () => {
      const plugin = new EchoPlugin(client);
      
      expect(plugin.logger).toBeDefined();
      expect(plugin.logger.constructor.name).toMatch(/Logger|SubLogger/);
      
      await client.addPlugin(plugin);
      
      // Logger should still be set and functional
      expect(() => plugin.logger.info("Test message")).not.toThrow();
    });
  });
  
  describe("startPlugin()", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should start specific plugin by ID", async () => {
      const plugin = new EchoPlugin(client);
      client.plugins[plugin.id] = plugin; // Add without starting
      
      expect(plugin.started).toBe(false);
      
      await client.startPlugin(plugin.id);
      
      expect(plugin.started).toBe(true);
      expect(plugin.startCalled).toHaveBeenCalled();
    });
    
    it("should handle starting non-existent plugin", async () => {
      await expect(client.startPlugin("non-existent")).resolves.toBeUndefined();
    });
    
    it("should handle plugin start failure", async () => {
      const failingPlugin = new FailingPlugin(client, { failOnStart: true });
      client.plugins[failingPlugin.id] = failingPlugin;
      
      await expect(client.startPlugin(failingPlugin.id)).rejects.toThrow("Plugin failed to start");
      expect(failingPlugin.started).toBe(false);
    });
  });
  
  describe("hasPlugin() / getPlugin()", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should check plugin existence", async () => {
      const plugin = new EchoPlugin(client);
      
      expect(client.hasPlugin(plugin.id)).toBe(false);
      
      await client.addPlugin(plugin);
      
      expect(client.hasPlugin(plugin.id)).toBe(true);
    });
    
    it("should retrieve plugin by ID", async () => {
      const plugin = new EchoPlugin(client);
      
      await client.addPlugin(plugin);
      
      const retrieved = client.getPlugin(plugin.id);
      expect(retrieved).toBe(plugin);
    });
    
    it("should return undefined for non-existent plugin", () => {
      const retrieved = client.getPlugin("non-existent");
      expect(retrieved).toBeUndefined();
    });
    
    it("should handle plugin type casting", async () => {
      const plugin = new EchoPlugin(client);
      await client.addPlugin(plugin);
      
      const retrieved = client.getPlugin<EchoPlugin>(plugin.id);
      expect(retrieved).toBe(plugin);
      expect(retrieved?.echoRequestCalled).toBeDefined();
    });
  });
  
  describe("plugin event routing", () => {
    let client1: CinderlinkClientInterface<PluginEventDef>;
    let client2: CinderlinkClientInterface<PluginEventDef>;
    let echoPlugin: EchoPlugin;
    
    beforeEach(async () => {
      const clients = await ClientTestUtils.createConnectedClients(2);
      client1 = clients[0]; // Server
      client2 = clients[1]; // Client
      
      echoPlugin = new EchoPlugin(client1);
      await client1.addPlugin(echoPlugin);
      
      await ClientTestUtils.waitForClientReady(client1);
      await ClientTestUtils.waitForClientReady(client2);
    });
    
    afterEach(async () => {
      await client1?.stop();
      await client2?.stop();
    });
    
    it("should route P2P events to plugins", async () => {
      const serverPeerId = client1.peerId!.toString();
      const message = {
        topic: "/echo/request" as const,
        payload: { message: "Test echo" },
      };
      
      await client2.send(serverPeerId, message);
      
      // Give some time for message processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(echoPlugin.echoRequestCalled).toHaveBeenCalledWith(
        expect.objectContaining({
          topic: "/echo/request",
          payload: { message: "Test echo" },
        })
      );
    });
    
    it("should route pubsub events to plugins", async () => {
      const pubsubPlugin = new PubSubTestPlugin(client1);
      await client1.addPlugin(pubsubPlugin);
      
      // Subscribe to the topic
      await client1.subscribe("test.broadcast" as any);
      
      const message = { content: "Broadcast test" };
      await client2.publish("test.broadcast", message);
      
      // Give some time for message processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(pubsubPlugin.broadcastReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Broadcast test",
        })
      );
    });
    
    it("should handle plugin event errors gracefully", async () => {
      const failingPlugin = new FailingPlugin(client1, { failOnMessage: true });
      await client1.addPlugin(failingPlugin);
      
      const message = {
        topic: "/fail/test",
        payload: { message: "This will fail" },
      };
      
      // Should not crash the client when plugin throws
      await expect(
        client2.send(client1.peerId!.toString(), message)
      ).resolves.toBeUndefined();
    });
    
    it("should bind plugin context correctly", async () => {
      const plugin = new EchoPlugin(client1);
      await client1.addPlugin(plugin);
      
      const serverPeerId = client1.peerId!.toString();
      const message = {
        topic: "/echo/request" as const,
        payload: { message: "Context test" },
      };
      
      await client2.send(serverPeerId, message);
      
      // Give some time for message processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // The handler should have been called with correct context
      expect(echoPlugin.echoRequestCalled).toHaveBeenCalled();
    });
  });
  
  describe("plugin lifecycle", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should start plugins when client starts", async () => {
      const plugin = new EchoPlugin(client);
      await client.addPlugin(plugin);
      
      // Plugin should already be started after adding
      expect(plugin.started).toBe(true);
      expect(plugin.startCalled).toHaveBeenCalled();
    });
    
    it("should stop plugins when client stops", async () => {
      const plugin = new EchoPlugin(client);
      await client.addPlugin(plugin);
      
      expect(plugin.started).toBe(true);
      
      await client.stop();
      
      expect(plugin.started).toBe(false);
      expect(plugin.stopCalled).toHaveBeenCalled();
    });
    
    it("should handle plugin stop failure gracefully", async () => {
      const failingPlugin = new FailingPlugin(client, { failOnStop: true });
      await client.addPlugin(failingPlugin);
      
      // Client stop should handle plugin stop failure
      await expect(client.stop()).resolves.toBeUndefined();
      expect(client.running).toBe(false);
    });
    
    it("should track plugin state correctly", async () => {
      const statePlugin = new StateTrackingPlugin(client);
      await client.addPlugin(statePlugin);
      
      const events = statePlugin.getEvents();
      const startEvent = events.find(e => e.type === "plugin.start");
      
      expect(startEvent).toBeDefined();
      expect(startEvent?.timestamp).toBeGreaterThan(0);
      
      await client.stop();
      
      const updatedEvents = statePlugin.getEvents();
      const stopEvent = updatedEvents.find(e => e.type === "plugin.stop");
      
      expect(stopEvent).toBeDefined();
    });
  });
  
  describe("plugin dependencies", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should allow plugins to access other plugins", async () => {
      const echoPlugin = new EchoPlugin(client);
      const statePlugin = new StateTrackingPlugin(client);
      
      await client.addPlugin(echoPlugin);
      await client.addPlugin(statePlugin);
      
      // Plugins should be able to access each other
      const retrievedEcho = client.getPlugin<EchoPlugin>(echoPlugin.id);
      const retrievedState = client.getPlugin<StateTrackingPlugin>(statePlugin.id);
      
      expect(retrievedEcho).toBe(echoPlugin);
      expect(retrievedState).toBe(statePlugin);
    });
    
    it("should provide access to client services", async () => {
      const plugin = new EchoPlugin(client);
      await client.addPlugin(plugin);
      
      // Plugin should have access to client
      expect(plugin.client).toBe(client);
      expect(plugin.client.ipfs).toBeDefined();
      expect(plugin.client.peers).toBeDefined();
      expect(plugin.client.schemas).toBeDefined();
    });
    
    it("should isolate plugin errors", async () => {
      const workingPlugin = new EchoPlugin(client);
      const failingPlugin = new FailingPlugin(client, { failOnStart: true });
      
      await client.addPlugin(workingPlugin);
      
      // Failing plugin should not affect working plugin
      await expect(client.addPlugin(failingPlugin)).rejects.toThrow();
      
      expect(client.hasPlugin(workingPlugin.id)).toBe(true);
      expect(workingPlugin.started).toBe(true);
      expect(client.hasPlugin(failingPlugin.id)).toBe(false);
    });
  });
  
  describe("plugin communication", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should allow inter-plugin communication via events", async () => {
      const plugin1 = TestDataGenerators.generatePlugin({ id: "plugin-1" });
      const plugin2 = TestDataGenerators.generatePlugin({ id: "plugin-2" });
      
      await client.addPlugin(plugin1);
      await client.addPlugin(plugin2);
      
      // Plugins should be able to emit and listen to events
      const mockHandler = vi.fn();
      client.pluginEvents.on("test.event" as any, mockHandler);
      
      await client.pluginEvents.emit("test.event" as any, { data: "test" });
      
      expect(mockHandler).toHaveBeenCalledWith({ data: "test" });
    });
    
    it("should maintain plugin event isolation", async () => {
      const plugin1 = new EchoPlugin(client);
      const plugin2 = new PubSubTestPlugin(client);
      
      await client.addPlugin(plugin1);
      await client.addPlugin(plugin2);
      
      // Events from one plugin should not interfere with another
      expect(plugin1.echoRequestCalled).not.toHaveBeenCalled();
      expect(plugin2.broadcastReceived).not.toHaveBeenCalled();
    });
  });
});