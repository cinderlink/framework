import { beforeEach, afterEach} from 'bun:test';
import { rmSync } from "fs";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { mainnet } from "viem/chains";
import { createDID, createSeed, signAddressVerification } from "@cinderlink/identifiers";
import { CinderlinkClient } from "../client";
import { TestFixtures, TestDataGenerators, EnhancedTestClient } from "@cinderlink/test-adapters";
import type {
  IPFSWithLibP2P,
  PluginEventDef,
  PeerRole,
} from "@cinderlink/core-types";
import { DID } from "dids";

/**
 * Test utilities for client package testing
 */
export class ClientTestUtils {
  static testDirs: string[] = [];
  
  /**
   * Create a test client with minimal configuration
   */
  static async createMinimalTestClient(options: {
    role?: PeerRole;
    testMode?: boolean;
    repo?: string;
  } = {}): Promise<CinderlinkClientInterface<PluginEventDef>> {
    const repo = options.repo || `test-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.testDirs.push(repo);
    
    // Generate test ethereum account
    const privateKey = `0x${Math.random().toString(16).slice(2).padStart(64, '0')}` as `0x${string}`;
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: mainnet,
      transport: http(),
    });
    
    // Generate test DID
    const did = await createDID(await createSeed(`test-${repo}`));
    const addressVerification = await signAddressVerification(
      "test",
      did.id,
      account,
      walletClient
    );
    
    // Create client with test configuration
    const { createClient } = await import("../create.ts");
    const client = await createClient({
      did,
      address: account.address,
      addressVerification,
      role: options.role || "peer",
      options: {
        testMode: options.testMode ?? true,
        repo,
        config: {
          Addresses: {
            Swarm: [
              `/ip4/127.0.0.1/tcp/${7400 + Math.floor(Math.random() * 100)}`,
              `/ip4/127.0.0.1/tcp/${7500 + Math.floor(Math.random() * 100)}/ws`
            ],
            API: `/ip4/127.0.0.1/tcp/${7600 + Math.floor(Math.random() * 100)}`,
          },
          Bootstrap: [],
        },
      },
    });
    
    // Set short timeouts for testing
    client.initialConnectTimeout = 100;
    client.keepAliveTimeout = 1000;
    client.keepAliveInterval = 500;
    
    return client;
  }
  
  /**
   * Create a test server client
   */
  static async createTestServer(port = 7350): Promise<CinderlinkClientInterface<PluginEventDef>> {
    return this.createMinimalTestClient({
      role: "server",
      repo: `test-server-${Date.now()}`,
    });
  }
  
  /**
   * Create multiple connected test clients
   */
  static async createConnectedClients(count: number): Promise<CinderlinkClientInterface<PluginEventDef>[]> {
    const clients: CinderlinkClientInterface<PluginEventDef>[] = [];
    
    // Create server first
    const server = await this.createTestServer();
    await server.start([]);
    clients.push(server);
    
    // Create peer clients and connect to server
    for (let i = 1; i < count; i++) {
      const client = await this.createMinimalTestClient({ role: "peer" });
      const serverInfo = await server.ipfs.id();
      await client.start([`/ip4/127.0.0.1/tcp/${server.ipfs.libp2p.services ? '7357' : '7356'}/ws/p2p/${serverInfo.id}`]);
      clients.push(client);
    }
    
    return clients;
  }
  
  /**
   * Create mock IPFS instance for testing
   */
  static async createMockIPFS(): Promise<IPFSWithLibP2P> {
    return TestFixtures.createMockIPFS();
  }
  
  /**
   * Clean up test directories
   */
  static cleanup() {
    this.testDirs.forEach(dir => {
      try {
        rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
        console.warn(`Failed to clean up ${dir}:`, error);
      }
    });
    this.testDirs = [];
  }
  
  /**
   * Setup test environment
   */
  static setupTestEnvironment() {
    beforeEach(() => {
    });
    
    afterEach(async () => {
      this.cleanup();
    });
  }
  
  /**
   * Wait for client to be ready
   */
  static async waitForClientReady(
    client: CinderlinkClientInterface<PluginEventDef>,
    timeout = 5000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Client not ready within ${timeout}ms`));
      }, timeout);
      
      if (client.running && client.hasServerConnection) {
        clearTimeout(timeoutId);
        resolve();
        return;
      }
      
      const checkReady = () => {
        if (client.running && (client.hasServerConnection || client.role === "server")) {
          clearTimeout(timeoutId);
          client.off("/client/ready", checkReady);
          resolve();
        }
      };
      
      client.on("/client/ready", checkReady);
    });
  }
  
  /**
   * Create test plugin for testing
   */
  static createTestPlugin(id = "test-plugin") {
    return TestDataGenerators.generatePlugin({
      id,
      hasP2PHandlers: true,
      hasPubSubHandlers: true,
    });
  }
  
  /**
   * Assert client state
   */
  static assertClientState(
    client: CinderlinkClientInterface<PluginEventDef>,
    expectedState: {
      running?: boolean;
      hasServerConnection?: boolean;
      pluginCount?: number;
      subscriptionCount?: number;
    }
  ) {
    if (expectedState.running !== undefined) {
      expect(client.running).toBe(expectedState.running);
    }
    if (expectedState.hasServerConnection !== undefined) {
      expect(client.hasServerConnection).toBe(expectedState.hasServerConnection);
    }
    if (expectedState.pluginCount !== undefined) {
      expect(Object.keys(client.plugins).length).toBe(expectedState.pluginCount);
    }
    if (expectedState.subscriptionCount !== undefined) {
      expect(client.subscriptions.length).toBe(expectedState.subscriptionCount);
    }
  }
  
  /**
   * Create network delay simulator
   */
  static createNetworkDelay(baseDelay = 50, jitter = 20) {
    return TestFixtures.createNetworkDelaySimulator(baseDelay, jitter);
  }
}