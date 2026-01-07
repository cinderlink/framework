import { TestClient } from "./client.js";
import type {
  Peer,
  PeerRole,
  IncomingP2PMessage,
  OutgoingP2PMessage,
  PluginEventDef,
  CinderlinkClientInterface,
} from "@cinderlink/core-types";
import { vi } from "vitest";
import { EventEmitter } from "events";

/**
 * Enhanced test client with additional testing capabilities
 * for simulating network conditions and message interception
 */
export class EnhancedTestClient<PluginEvents extends PluginEventDef = PluginEventDef> 
  extends TestClient<PluginEvents> {
  
  private messageInterceptors: Array<(msg: any) => void> = [];
  private networkDelay = 0;
  private connectionFailureRate = 0;
  private connectedPeers = new Map<string, Peer>();
  private messageQueue: Array<{message: any, timestamp: number}> = [];
  
  // Simulate peer connection
  async simulateConnection(peer: Peer): Promise<void> {
    // Simulate network delay
    if (this.networkDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.networkDelay));
    }
    
    // Simulate connection failure
    if (Math.random() < this.connectionFailureRate) {
      throw new Error(`Connection failed to peer ${peer.peerId}`);
    }
    
    this.connectedPeers.set(peer.peerId.toString(), peer);
    this.peers.addPeer(peer);
    
    // Emit connection event
    await this.emit("/peer/connect", peer);
  }
  
  // Simulate peer disconnection
  async simulateDisconnection(peerId: string): Promise<void> {
    const peer = this.connectedPeers.get(peerId);
    if (peer) {
      this.connectedPeers.delete(peerId);
      await this.emit("/peer/disconnect", peer);
    }
  }
  
  // Set network delay for all operations
  setNetworkDelay(ms: number): void {
    this.networkDelay = ms;
  }
  
  // Set connection failure rate (0-1)
  setConnectionFailureRate(rate: number): void {
    this.connectionFailureRate = Math.max(0, Math.min(1, rate));
  }
  
  // Intercept outgoing messages
  interceptMessages(handler: (msg: any) => void): void {
    this.messageInterceptors.push(handler);
  }
  
  // Override send to add interception and network simulation
  async send<
    Events extends PluginEventDef = PluginEvents,
    Topic extends keyof Events["send"] = keyof Events["send"]
  >(
    peerId: string,
    message: OutgoingP2PMessage<Events, Topic>,
    options = { sign: false, encrypt: false }
  ): Promise<void> {
    // Intercept message
    this.messageInterceptors.forEach(handler => handler({
      type: 'send',
      peerId,
      message,
      options,
      timestamp: Date.now()
    }));
    
    // Simulate network delay
    if (this.networkDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.networkDelay));
    }
    
    // Queue message for inspection
    this.messageQueue.push({
      message: { type: 'send', peerId, message, options },
      timestamp: Date.now()
    });
    
    // Call parent implementation
    super.send();
  }
  
  // Override request to add interception
  async request<
    Events extends PluginEventDef = PluginEvents,
    OutTopic extends keyof Events["send"] = keyof Events["send"],
    InTopic extends keyof Events["receive"] = keyof Events["receive"]
  >(
    peerId: string,
    message: OutgoingP2PMessage<Events, OutTopic>,
    options = { sign: false, encrypt: false }
  ): Promise<IncomingP2PMessage<Events, InTopic> | undefined> {
    // Intercept request
    this.messageInterceptors.forEach(handler => handler({
      type: 'request',
      peerId,
      message,
      options,
      timestamp: Date.now()
    }));
    
    // Simulate network delay
    if (this.networkDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.networkDelay));
    }
    
    // Simulate timeout or failure
    if (Math.random() < this.connectionFailureRate) {
      return undefined;
    }
    
    return super.request(peerId, message, options);
  }
  
  // Get message history for testing
  getMessageHistory(): Array<{message: any, timestamp: number}> {
    return [...this.messageQueue];
  }
  
  // Clear message history
  clearMessageHistory(): void {
    this.messageQueue = [];
  }
  
  // Simulate network partition
  async simulateNetworkPartition(partitionedPeers: string[]): Promise<void> {
    partitionedPeers.forEach(peerId => {
      const peer = this.connectedPeers.get(peerId);
      if (peer) {
        peer.connected = false;
      }
    });
  }
  
  // Heal network partition
  async healNetworkPartition(peers: string[]): Promise<void> {
    for (const peerId of peers) {
      const peer = this.connectedPeers.get(peerId);
      if (peer) {
        peer.connected = true;
        await this.emit("/peer/reconnect", peer);
      }
    }
  }
  
  // Get connected peers for testing
  getConnectedPeers(): Peer[] {
    return Array.from(this.connectedPeers.values());
  }
}

/**
 * Network simulation utilities for testing
 */
export class NetworkSimulator {
  private clients = new Map<string, EnhancedTestClient>();
  
  // Register a client in the network
  registerClient(client: EnhancedTestClient): void {
    this.clients.set(client.id, client);
  }
  
  // Create a network with multiple clients
  async createNetwork(nodeCount: number): Promise<EnhancedTestClient[]> {
    const clients: EnhancedTestClient[] = [];
    
    for (let i = 0; i < nodeCount; i++) {
      const did = { id: `did:test:node${i}` } as any;
      const client = new EnhancedTestClient(did);
      this.registerClient(client);
      clients.push(client);
    }
    
    return clients;
  }
  
  // Connect all clients in a mesh
  async connectMesh(clients: EnhancedTestClient[]): Promise<void> {
    for (let i = 0; i < clients.length; i++) {
      for (let j = i + 1; j < clients.length; j++) {
        const peer: Peer = {
          peerId: { toString: () => clients[j].id } as any,
          did: clients[j].did.id,
          connected: true,
          role: 'peer' as PeerRole,
          metadata: {}
        };
        
        await clients[i].simulateConnection(peer);
        
        const reversePeer: Peer = {
          peerId: { toString: () => clients[i].id } as any,
          did: clients[i].did.id,
          connected: true,
          role: 'peer' as PeerRole,
          metadata: {}
        };
        
        await clients[j].simulateConnection(reversePeer);
      }
    }
  }
  
  // Simulate network partition
  async partitionNetwork(group1: string[], group2: string[]): Promise<void> {
    // Disconnect group1 from group2
    for (const id1 of group1) {
      const client1 = this.clients.get(id1);
      if (client1) {
        await client1.simulateNetworkPartition(group2);
      }
    }
    
    for (const id2 of group2) {
      const client2 = this.clients.get(id2);
      if (client2) {
        await client2.simulateNetworkPartition(group1);
      }
    }
  }
  
  // Heal network partition
  async healPartition(): Promise<void> {
    // Reconnect all clients
    const allClients = Array.from(this.clients.values());
    await this.connectMesh(allClients);
  }
  
  // Simulate message broadcast
  async broadcastMessage(
    fromClient: string,
    topic: string,
    message: any
  ): Promise<void> {
    const sender = this.clients.get(fromClient);
    if (!sender) return;
    
    // Simulate pubsub broadcast to all connected peers
    for (const [id, client] of this.clients) {
      if (id !== fromClient) {
        await client.pubsub.emit(topic as any, {
          topic,
          data: message,
          from: { toString: () => fromClient } as any,
          receivedFrom: fromClient
        } as any);
      }
    }
  }
  
  // Get network statistics
  getNetworkStats(): {
    totalClients: number;
    totalConnections: number;
    partitionedClients: number;
  } {
    let totalConnections = 0;
    let partitionedClients = 0;
    
    for (const client of this.clients.values()) {
      const connectedPeers = client.getConnectedPeers();
      totalConnections += connectedPeers.length;
      
      if (connectedPeers.some(p => !p.connected)) {
        partitionedClients++;
      }
    }
    
    return {
      totalClients: this.clients.size,
      totalConnections: totalConnections / 2, // Divide by 2 for bidirectional
      partitionedClients
    };
  }
}