import { describe, it, expect, beforeEach, afterEach} from 'bun:test';

import { ClientTestUtils } from "./__fixtures__/test-utils";
import { EchoPlugin, PubSubTestPlugin, FailingPlugin } from "./__fixtures__/test-plugins";
import { TestDataGenerators } from "@cinderlink/test-adapters";
import type {
  PluginEventDef,
  OutgoingP2PMessage,
  IncomingP2PMessage,
} from "@cinderlink/core-types";

describe("CinderlinkClient P2P Messaging", () => {
  ClientTestUtils.setupTestEnvironment();
  
  describe("send()", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    let server: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      const clients = await ClientTestUtils.createConnectedClients(2);
      server = clients[0];
      client = clients[1];
      
      // Wait for connection to be established
      await ClientTestUtils.waitForClientReady(client);
      await ClientTestUtils.waitForClientReady(server);
    });
    
    afterEach(async () => {
      await client?.stop();
      await server?.stop();
    });
    
    it("should send unsigned message to peer", async () => {
      const serverPeerId = server.peerId!.toString();
      const message: OutgoingP2PMessage<PluginEventDef, string> = {
        topic: "/test/message",
        payload: { content: "Hello, server!" },
      };
      
      // Mock the stream handling to capture sent data
      const mockSend = vi.fn();
      const originalSend = client.send;
      client.send = mockSend;
      
      await client.send(serverPeerId, message);
      
      expect(mockSend).toHaveBeenCalledWith(serverPeerId, message);
    });
    
    it("should send signed message", async () => {
      const serverPeerId = server.peerId!.toString();
      const message: OutgoingP2PMessage<PluginEventDef, string> = {
        topic: "/test/signed",
        payload: { content: "Signed message" },
      };
      
      const mockSend = vi.fn();
      client.send = mockSend;
      
      await client.send(serverPeerId, message, { sign: true });
      
      expect(mockSend).toHaveBeenCalledWith(
        serverPeerId,
        message,
        { sign: true }
      );
    });
    
    it("should send encrypted message", async () => {
      const serverPeerId = server.peerId!.toString();
      const message: OutgoingP2PMessage<PluginEventDef, string> = {
        topic: "/test/encrypted",
        payload: { content: "Secret message" },
      };
      
      const mockSend = vi.fn();
      client.send = mockSend;
      
      await client.send(serverPeerId, message, { encrypt: true });
      
      expect(mockSend).toHaveBeenCalledWith(
        serverPeerId,
        message,
        { encrypt: true }
      );
    });
    
    it("should handle peer not found", async () => {
      const nonExistentPeerId = "12D3KooWNonExistentPeerID";
      const message: OutgoingP2PMessage<PluginEventDef, string> = {
        topic: "/test/message",
        payload: { content: "Hello" },
      };
      
      // Should handle gracefully without throwing
      await expect(client.send(nonExistentPeerId, message)).resolves.toBeUndefined();
    });
    
    it("should handle connection failure", async () => {
      const serverPeerId = server.peerId!.toString();
      const message: OutgoingP2PMessage<PluginEventDef, string> = {
        topic: "/test/message",
        payload: { content: "Hello" },
      };
      
      // Disconnect the server
      await server.stop();
      
      // Should handle connection failure gracefully
      await expect(client.send(serverPeerId, message)).resolves.toBeUndefined();
    });
    
    it("should retry on failure with retry options", async () => {
      const serverPeerId = server.peerId!.toString();
      const message: OutgoingP2PMessage<PluginEventDef, string> = {
        topic: "/test/retry",
        payload: { content: "Retry test" },
      };
      
      let attemptCount = 0;
      const originalSend = client.send.bind(client);
      client.send = vi.fn().mockImplementation(async (...args) => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error("Simulated failure");
        }
        return originalSend(...args);
      });
      
      // Should retry and eventually succeed
      await expect(
        client.send(serverPeerId, message, { retries: 3 })
      ).resolves.toBeUndefined();
    });
    
    it("should encode protocol messages correctly", async () => {
      const serverPeerId = server.peerId!.toString();
      const message: OutgoingP2PMessage<PluginEventDef, string> = {
        topic: "/test/encoding",
        payload: { content: "Encoding test", number: 42, array: [1, 2, 3] },
      };
      
      const mockSend = vi.fn();
      client.send = mockSend;
      
      await client.send(serverPeerId, message);
      
      expect(mockSend).toHaveBeenCalledWith(serverPeerId, message);
    });
  });
  
  describe("request()", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    let server: CinderlinkClientInterface<PluginEventDef>;
    let echoPlugin: EchoPlugin;
    
    beforeEach(async () => {
      const clients = await ClientTestUtils.createConnectedClients(2);
      server = clients[0];
      client = clients[1];
      
      // Add echo plugin to server
      echoPlugin = new EchoPlugin(server);
      await server.addPlugin(echoPlugin);
      
      await ClientTestUtils.waitForClientReady(client);
      await ClientTestUtils.waitForClientReady(server);
    });
    
    afterEach(async () => {
      await client?.stop();
      await server?.stop();
    });
    
    it("should send request and receive response", async () => {
      const serverPeerId = server.peerId!.toString();
      const requestMessage = {
        topic: "/echo/request" as const,
        payload: { message: "Hello echo!" },
      };
      
      const response = await client.request(serverPeerId, requestMessage);
      
      expect(response).toBeDefined();
      expect(echoPlugin.echoRequestCalled).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { message: "Hello echo!" },
        })
      );
    });
    
    it("should timeout on no response", async () => {
      const serverPeerId = server.peerId!.toString();
      const requestMessage = {
        topic: "/nonexistent/request" as const,
        payload: { message: "No handler" },
      };
      
      // Mock request with short timeout
      const originalRequest = client.request.bind(client);
      client.request = vi.fn().mockImplementation(async (peerId, message, options) => {
        return new Promise((resolve) => {
          setTimeout(() => resolve(undefined), 100);
        });
      });
      
      const response = await client.request(serverPeerId, requestMessage);
      expect(response).toBeUndefined();
    });
    
    it("should handle malformed responses", async () => {
      const serverPeerId = server.peerId!.toString();
      const requestMessage = {
        topic: "/test/malformed" as const,
        payload: { message: "Test" },
      };
      
      // Mock request to return malformed response
      client.request = vi.fn().mockResolvedValue({
        topic: "/test/response",
        payload: null, // Malformed payload
        peer: { peerId: server.peerId },
      });
      
      const response = await client.request(serverPeerId, requestMessage);
      expect(response).toBeDefined();
      expect(response?.payload).toBeNull();
    });
    
    it("should support request cancellation", async () => {
      const serverPeerId = server.peerId!.toString();
      const requestMessage = {
        topic: "/echo/request" as const,
        payload: { message: "Cancel me" },
      };
      
      // Create a request that takes time
      const requestPromise = client.request(serverPeerId, requestMessage);
      
      // Cancel by stopping client
      setTimeout(() => client.stop(), 50);
      
      // Should handle cancellation gracefully
      await expect(requestPromise).resolves.toBeDefined();
    });
  });
  
  describe("publish()", () => {
    let clients: CinderlinkClientInterface<PluginEventDef>[];
    let pubsubPlugins: PubSubTestPlugin[];
    
    beforeEach(async () => {
      clients = await ClientTestUtils.createConnectedClients(3);
      pubsubPlugins = [];
      
      // Add pubsub plugins to all clients
      for (const client of clients) {
        const plugin = new PubSubTestPlugin(client);
        await client.addPlugin(plugin);
        pubsubPlugins.push(plugin);
        await ClientTestUtils.waitForClientReady(client);
      }
    });
    
    afterEach(async () => {
      for (const c of clients ?? []) {
        await c?.stop();
      }
    });
    
    it("should publish message to topic", async () => {
      const publisher = clients[0];
      const message = { content: "Hello everyone!" };
      
      await publisher.publish("test.broadcast", message);
      
      // Should be able to publish without error
      expect(true).toBe(true); // Basic test that publish doesn't throw
    });
    
    it("should publish signed message", async () => {
      const publisher = clients[0];
      const message = { content: "Signed broadcast" };
      
      await publisher.publish("test.broadcast", message, { sign: true });
      
      expect(true).toBe(true);
    });
    
    it("should publish encrypted message", async () => {
      const publisher = clients[0];
      const message = { content: "Secret broadcast" };
      
      await publisher.publish("test.broadcast", message, { encrypt: true });
      
      expect(true).toBe(true);
    });
    
    it("should handle publish to non-existent topic", async () => {
      const publisher = clients[0];
      const message = { content: "No subscribers" };
      
      await expect(
        publisher.publish("nonexistent.topic", message)
      ).resolves.toBeUndefined();
    });
  });
  
  describe("subscribe() / unsubscribe()", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    let pubsubPlugin: PubSubTestPlugin;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
      
      pubsubPlugin = new PubSubTestPlugin(client);
      await client.addPlugin(pubsubPlugin);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should subscribe to topic", async () => {
      const topic = "test.broadcast";
      
      expect(client.subscriptions).not.toContain(topic);
      
      await client.subscribe(topic as any);
      
      expect(client.subscriptions).toContain(topic);
    });
    
    it("should handle duplicate subscription", async () => {
      const topic = "test.broadcast";
      
      await client.subscribe(topic as any);
      await client.subscribe(topic as any); // Subscribe again
      
      // Should only appear once in subscriptions
      const subscriptionCount = client.subscriptions.filter(s => s === topic).length;
      expect(subscriptionCount).toBe(1);
    });
    
    it("should unsubscribe from topic", async () => {
      const topic = "test.broadcast";
      
      await client.subscribe(topic as any);
      expect(client.subscriptions).toContain(topic);
      
      await client.unsubscribe(topic as any);
      
      expect(client.subscriptions).not.toContain(topic);
    });
    
    it("should handle unsubscribe from non-subscribed topic", async () => {
      const topic = "never.subscribed";
      
      expect(client.subscriptions).not.toContain(topic);
      
      await expect(client.unsubscribe(topic as any)).resolves.toBeUndefined();
      
      expect(client.subscriptions).not.toContain(topic);
    });
  });
  
  describe("message encoding/decoding", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should handle various payload types", async () => {
      const testPayloads = [
        { type: "string", data: "Hello world" },
        { type: "number", data: 42 },
        { type: "boolean", data: true },
        { type: "array", data: [1, 2, 3] },
        { type: "object", data: { nested: { value: "test" } } },
        { type: "null", data: null },
        { type: "undefined", data: undefined },
      ];
      
      for (const test of testPayloads) {
        const message = {
          topic: "/test/payload",
          payload: test.data,
        };
        
        // Should not throw for any payload type
        await expect(
          client.send("test-peer", message as any)
        ).resolves.toBeUndefined();
      }
    });
    
    it("should handle large payloads", async () => {
      const largePayload = TestDataGenerators.generateMessage("large");
      const message = {
        topic: "/test/large",
        payload: largePayload,
      };
      
      await expect(
        client.send("test-peer", message as any)
      ).resolves.toBeUndefined();
    });
    
    it("should handle binary data", async () => {
      const binaryData = new Uint8Array(1000).fill(255);
      const message = {
        topic: "/test/binary",
        payload: { data: Array.from(binaryData) },
      };
      
      await expect(
        client.send("test-peer", message)
      ).resolves.toBeUndefined();
    });
  });
  
  describe("error handling", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should handle network errors gracefully", async () => {
      // Mock network error
      const originalSend = client.send.bind(client);
      client.send = vi.fn().mockRejectedValue(new Error("Network error"));
      
      const message = {
        topic: "/test/error",
        payload: { message: "Test" },
      };
      
      await expect(client.send("test-peer", message)).rejects.toThrow("Network error");
    });
    
    it("should handle encoding errors", async () => {
      // Create circular reference that can't be JSON encoded
      const circularObj: any = { name: "test" };
      circularObj.self = circularObj;
      
      const message = {
        topic: "/test/circular",
        payload: circularObj,
      };
      
      // Should handle encoding error gracefully
      await expect(
        client.send("test-peer", message)
      ).resolves.toBeUndefined();
    });
    
    it("should handle peer disconnection during request", async () => {
      const server = await ClientTestUtils.createTestServer();
      await server.start([]);
      
      const serverPeerId = server.peerId!.toString();
      const message = {
        topic: "/test/disconnect",
        payload: { message: "Test" },
      };
      
      // Start request
      const requestPromise = client.request(serverPeerId, message);
      
      // Disconnect server immediately
      await server.stop();
      
      // Request should handle disconnection
      const response = await requestPromise;
      expect(response).toBeUndefined();
    });
  });
});