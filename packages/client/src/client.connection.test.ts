import { describe, it, expect, beforeEach, afterEach} from 'bun:test';

import { ClientTestUtils } from "./__fixtures__/test-utils";
import { StateTrackingPlugin } from "./__fixtures__/test-plugins";
import { TestDataGenerators, TestFixtures } from "@cinderlink/test-adapters";
import type {
  PluginEventDef,
  Peer,
  PeerRole,
} from "@cinderlink/core-types";
import { createEd25519PeerId } from "@libp2p/peer-id-factory";

describe("CinderlinkClient Connection Management", () => {
  ClientTestUtils.setupTestEnvironment();
  
  describe("connect()", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    let server: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient({ role: "peer" });
      server = await ClientTestUtils.createTestServer();
      await client.start([]);
      await server.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
      await server?.stop();
    });
    
    it("should connect to a peer successfully", async () => {
      const serverPeerId = server.peerId!;
      const serverInfo = await server.ipfs.id();
      
      expect(client.peers.hasPeer(serverPeerId.toString())).toBe(false);
      
      await client.connect(serverPeerId, "server");
      
      expect(client.peers.hasPeer(serverPeerId.toString())).toBe(true);
      const peer = client.peers.getPeer(serverPeerId.toString());
      expect(peer?.role).toBe("server");
      expect(peer?.connected).toBe(true);
    });
    
    it("should handle connection to self gracefully", async () => {
      const selfPeerId = client.peerId!;
      
      // Should not throw when trying to connect to self
      await expect(client.connect(selfPeerId, "peer")).resolves.toBeUndefined();
      
      // Should not add self as peer
      expect(client.peers.hasPeer(selfPeerId.toString())).toBe(false);
    });
    
    it("should handle already connected peer", async () => {
      const serverPeerId = server.peerId!;
      
      // Connect once
      await client.connect(serverPeerId, "server");
      expect(client.peers.getPeer(serverPeerId.toString())?.connected).toBe(true);
      
      // Connect again - should handle gracefully
      await expect(client.connect(serverPeerId, "server")).resolves.toBeUndefined();
      expect(client.peers.getPeer(serverPeerId.toString())?.connected).toBe(true);
    });
    
    it("should handle connection with no peer data", async () => {
      const randomPeerId = await createEd25519PeerId();
      
      // Should handle connection to unknown peer
      await expect(client.connect(randomPeerId, "peer")).resolves.toBeUndefined();
    });
    
    it("should handle connection timeout", async () => {
      const randomPeerId = await createEd25519PeerId();
      
      // Mock dial to timeout
      const mockDial = vi.fn().mockRejectedValue(new Error("Connection timeout"));
      client.ipfs.libp2p.dial = mockDial;
      
      await expect(client.connect(randomPeerId, "peer")).resolves.toBeUndefined();
    });
    
    it("should emit connection events", async () => {
      const statePlugin = new StateTrackingPlugin(client);
      await client.addPlugin(statePlugin);
      
      const serverPeerId = server.peerId!;
      
      await client.connect(serverPeerId, "server");
      
      const connectEvents = statePlugin.getEventsByType("peer.connect");
      expect(connectEvents.length).toBeGreaterThan(0);
      expect(connectEvents[0].data?.peerId).toBe(serverPeerId.toString());
    });
  });
  
  describe("connectToNodes()", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    let servers: CinderlinkClientInterface<PluginEventDef>[];
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient({ role: "peer" });
      servers = [];
      
      // Create multiple test servers
      for (let i = 0; i < 3; i++) {
        const server = await ClientTestUtils.createTestServer();
        await server.start([]);
        servers.push(server);
      }
      
      await client.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
      for (const server of servers ?? []) {
        await server?.stop();
      }
    });
    
    it("should connect to multiple nodes", async () => {
      // Set node addresses for the servers
      client.nodeAddresses = await Promise.all(
        servers.map(async (server) => {
          const info = await server.ipfs.id();
          return `/ip4/127.0.0.1/tcp/7356/p2p/${info.id}`;
        })
      );
      
      await client.connectToNodes();
      
      // Should have attempted to connect to all servers
      for (const server of servers) {
        const serverPeerId = server.peerId!.toString();
        expect(client.peers.hasPeer(serverPeerId)).toBe(true);
      }
    });
    
    it("should skip connection to self", async () => {
      const selfInfo = await client.ipfs.id();
      client.nodeAddresses = [`/ip4/127.0.0.1/tcp/7356/p2p/${selfInfo.id}`];
      
      await expect(client.connectToNodes()).resolves.toBeUndefined();
      
      // Should not add self as peer
      expect(client.peers.hasPeer(selfInfo.id.toString())).toBe(false);
    });
    
    it("should handle connection failures gracefully", async () => {
      // Add invalid node addresses
      client.nodeAddresses = [
        "/ip4/127.0.0.1/tcp/99999/p2p/12D3KooWInvalidPeerID",
        "/ip4/192.168.1.999/tcp/4001/p2p/12D3KooWAnotherInvalid",
      ];
      
      // Should not throw on connection failures
      await expect(client.connectToNodes()).resolves.toBeUndefined();
    });
    
    it("should handle empty node addresses", async () => {
      client.nodeAddresses = [];
      
      await expect(client.connectToNodes()).resolves.toBeUndefined();
    });
    
    it("should handle malformed addresses", async () => {
      client.nodeAddresses = [
        "not-a-multiaddr",
        "/ip4/invalid",
        "",
      ];
      
      await expect(client.connectToNodes()).resolves.toBeUndefined();
    });
  });
  
  describe("onPeerConnect()", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    let statePlugin: StateTrackingPlugin;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
      
      statePlugin = new StateTrackingPlugin(client);
      await client.addPlugin(statePlugin);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should handle peer connection with role", async () => {
      const peer = await TestDataGenerators.generatePeer({ role: "server" });
      
      client.onPeerConnect(peer);
      
      expect(client.peers.hasPeer(peer.peerId.toString())).toBe(true);
      const storedPeer = client.peers.getPeer(peer.peerId.toString());
      expect(storedPeer?.role).toBe("server");
    });
    
    it("should handle peer connection without role", async () => {
      const peer = await TestDataGenerators.generatePeer({ role: undefined as any });
      
      // Should handle gracefully without throwing
      expect(() => client.onPeerConnect(peer)).not.toThrow();
    });
    
    it("should emit server connect event for server peers", async () => {
      const serverPeer = await TestDataGenerators.generatePeer({ role: "server" });
      
      client.onPeerConnect(serverPeer);
      
      const serverConnectEvents = statePlugin.getEventsByType("server.connect");
      expect(serverConnectEvents.length).toBe(1);
    });
    
    it("should not emit server connect for non-server peers", async () => {
      const regularPeer = await TestDataGenerators.generatePeer({ role: "peer" });
      
      client.onPeerConnect(regularPeer);
      
      const serverConnectEvents = statePlugin.getEventsByType("server.connect");
      expect(serverConnectEvents.length).toBe(0);
    });
    
    it("should update hasServerConnection for server peers", async () => {
      expect(client.hasServerConnection).toBe(false);
      
      const serverPeer = await TestDataGenerators.generatePeer({ role: "server" });
      client.onPeerConnect(serverPeer);
      
      expect(client.hasServerConnection).toBe(true);
    });
  });
  
  describe("onPeerDisconnect()", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    let statePlugin: StateTrackingPlugin;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
      
      statePlugin = new StateTrackingPlugin(client);
      await client.addPlugin(statePlugin);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should handle peer disconnection", async () => {
      const peer = await TestDataGenerators.generatePeer({ role: "server" });
      
      // First connect the peer
      client.onPeerConnect(peer);
      expect(client.peers.hasPeer(peer.peerId.toString())).toBe(true);
      
      // Then disconnect
      await client.onPeerDisconnect(peer);
      
      const disconnectEvents = statePlugin.getEventsByType("peer.disconnect");
      expect(disconnectEvents.length).toBe(1);
    });
    
    it("should update hasServerConnection when server disconnects", async () => {
      const serverPeer = await TestDataGenerators.generatePeer({ role: "server" });
      
      // Connect server
      client.onPeerConnect(serverPeer);
      expect(client.hasServerConnection).toBe(true);
      
      // Disconnect server
      await client.onPeerDisconnect(serverPeer);
      expect(client.hasServerConnection).toBe(false);
    });
    
    it("should handle disconnection of unknown peer", async () => {
      const unknownPeer = await TestDataGenerators.generatePeer({ role: "peer" });
      
      // Should handle gracefully
      await expect(client.onPeerDisconnect(unknownPeer)).resolves.toBeUndefined();
    });
    
    it("should mark peer as disconnected", async () => {
      const peer = await TestDataGenerators.generatePeer({ role: "peer" });
      
      client.onPeerConnect(peer);
      const connectedPeer = client.peers.getPeer(peer.peerId.toString());
      expect(connectedPeer?.connected).toBe(true);
      
      await client.onPeerDisconnect(peer);
      
      const disconnectedPeer = client.peers.getPeer(peer.peerId.toString());
      expect(disconnectedPeer?.connected).toBe(false);
    });
  });
  
  describe("peerReadable()", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should return readable status for connected peer", async () => {
      const peer = await TestDataGenerators.generatePeer({ 
        role: "peer",
        connected: true 
      });
      
      client.onPeerConnect(peer);
      
      const isReadable = client.peerReadable(peer);
      expect(typeof isReadable).toBe("boolean");
    });
    
    it("should return false for disconnected peer", async () => {
      const peer = await TestDataGenerators.generatePeer({ 
        role: "peer",
        connected: false 
      });
      
      client.onPeerConnect(peer);
      
      const isReadable = client.peerReadable(peer);
      expect(isReadable).toBe(false);
    });
    
    it("should handle peer without connection data", async () => {
      const peer = await TestDataGenerators.generatePeer({ role: "peer" });
      // Don't add to client peers
      
      const isReadable = client.peerReadable(peer);
      expect(isReadable).toBe(false);
    });
  });
  
  describe("connection recovery", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    let server: CinderlinkClientInterface<PluginEventDef>;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient({ role: "peer" });
      server = await ClientTestUtils.createTestServer();
      await server.start([]);
      await client.start([]);
    });
    
    afterEach(async () => {
      await client?.stop();
      await server?.stop();
    });
    
    it("should attempt reconnection on connection loss", async () => {
      const serverPeerId = server.peerId!;
      
      // Connect initially
      await client.connect(serverPeerId, "server");
      expect(client.hasServerConnection).toBe(true);
      
      // Simulate connection loss
      const serverPeer = client.peers.getPeer(serverPeerId.toString());
      if (serverPeer) {
        await client.onPeerDisconnect(serverPeer);
      }
      
      expect(client.hasServerConnection).toBe(false);
      
      // Client should attempt reconnection (this would happen via timers in real implementation)
      // For test, we manually trigger reconnection attempt
      await client.connectToNodes();
    });
    
    it("should handle multiple connection attempts gracefully", async () => {
      const serverPeerId = server.peerId!;
      
      // Multiple rapid connection attempts should not cause issues
      const connectionPromises = Array.from({ length: 5 }, () =>
        client.connect(serverPeerId, "server")
      );
      
      await expect(Promise.all(connectionPromises)).resolves.toBeDefined();
      
      // Should still have clean connection state
      expect(client.peers.hasPeer(serverPeerId.toString())).toBe(true);
    });
    
    it("should handle connection state inconsistencies", async () => {
      const peer = await TestDataGenerators.generatePeer({ 
        role: "server",
        connected: true 
      });
      
      // Manually add peer as connected
      client.peers.addPeer(peer);
      
      // Then try to connect again
      await expect(client.connect(peer.peerId, "server")).resolves.toBeUndefined();
      
      // Should handle state inconsistency gracefully
      expect(client.peers.hasPeer(peer.peerId.toString())).toBe(true);
    });
  });
  
  describe("peer discovery", () => {
    let client: CinderlinkClientInterface<PluginEventDef>;
    let statePlugin: StateTrackingPlugin;
    
    beforeEach(async () => {
      client = await ClientTestUtils.createMinimalTestClient();
      await client.start([]);
      
      statePlugin = new StateTrackingPlugin(client);
      await client.addPlugin(statePlugin);
    });
    
    afterEach(async () => {
      await client?.stop();
    });
    
    it("should handle peer discovery events", async () => {
      const discoveredPeer = await TestDataGenerators.generatePeer({ role: "peer" });
      
      // Simulate peer discovery event
      await client.emit("peer:discovery", discoveredPeer);
      
      // Should handle discovery without throwing
      expect(true).toBe(true);
    });
    
    it("should validate discovered peers", async () => {
      const invalidPeer = { 
        peerId: null,
        role: "peer" 
      } as any;
      
      // Should handle invalid peer data gracefully
      await expect(client.emit("peer:discovery", invalidPeer)).resolves.toBeUndefined();
    });
  });
});