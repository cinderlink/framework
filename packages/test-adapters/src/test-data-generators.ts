import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { randomBytes } from "crypto";
import type {
  Peer,
  PeerRole,
  SchemaInterface,
  PluginInterface,
  SubLoggerInterface,
  CinderlinkClientInterface,
} from "@cinderlink/core-types";
import { PeerId } from "@libp2p/interface";
import { createEd25519PeerId } from "@libp2p/peer-id-factory";
import { CID } from "multiformats/cid";
import * as Block from "multiformats/block";
import * as json from "multiformats/codecs/json";
import { sha256 } from "multiformats/hashes/sha2";
import { z } from "zod";

/**
 * Test data generators for creating realistic test scenarios
 */
export class TestDataGenerators {
  /**
   * Generate a valid DID for testing
   */
  static async generateDID(seed?: string): Promise<DID> {
    const seedBytes = seed 
      ? Buffer.from(seed.padEnd(32, '0'))
      : randomBytes(32);
    
    const provider = new Ed25519Provider(seedBytes);
    const did = new DID({ provider });
    await did.authenticate();
    return did;
  }
  
  /**
   * Generate a test peer with configurable properties
   */
  static async generatePeer(options: {
    role?: PeerRole;
    connected?: boolean;
    did?: string;
    metadata?: Record<string, unknown>;
  } = {}): Promise<Peer> {
    const peerId = await createEd25519PeerId();
    const did = options.did || `did:test:${randomBytes(16).toString('hex')}`;
    
    return {
      peerId,
      did,
      connected: options.connected ?? true,
      role: options.role || 'peer',
      metadata: options.metadata || {}
    };
  }
  
  /**
   * Generate a test message with various payload types
   */
  static generateMessage(type: 'simple' | 'complex' | 'large' = 'simple'): any {
    switch (type) {
      case 'simple':
        return {
          message: `Test message ${Date.now()}`,
          timestamp: Date.now()
        };
        
      case 'complex':
        return {
          id: randomBytes(16).toString('hex'),
          type: 'test',
          nested: {
            data: Array.from({ length: 5 }, (_, i) => ({
              index: i,
              value: randomBytes(8).toString('hex')
            })),
            metadata: {
              created: new Date().toISOString(),
              version: '1.0.0'
            }
          },
          tags: ['test', 'generated', 'complex']
        };
        
      case 'large':
        // Generate ~100KB of data
        return {
          id: randomBytes(16).toString('hex'),
          largeArray: Array.from({ length: 1000 }, () => ({
            data: randomBytes(100).toString('base64')
          })),
          timestamp: Date.now()
        };
    }
  }
  
  /**
   * Generate a test schema with Zod validation
   */
  static generateSchema(complexity: 'simple' | 'complex' = 'simple'): SchemaInterface {
    if (complexity === 'simple') {
      return {
        schemaId: `test-schema-${Date.now()}`,
        schema: {
          name: z.string().min(1).max(100),
          value: z.number().positive(),
          tags: z.array(z.string()).optional()
        } as any,
        indexes: ['name'],
        unique: ['name']
      };
    }
    
    // Complex schema with nested objects and relations
    return {
      schemaId: `complex-schema-${Date.now()}`,
      schema: {
        id: z.string().uuid(),
        profile: z.object({
          name: z.string(),
          bio: z.string().optional(),
          avatar: z.string().url().optional(),
          verified: z.boolean().default(false)
        }),
        connections: z.array(z.object({
          userId: z.string(),
          type: z.enum(['friend', 'follower', 'blocked']),
          since: z.date()
        })),
        metadata: z.record(z.unknown()).optional(),
        createdAt: z.date(),
        updatedAt: z.date()
      } as any,
      indexes: ['profile.name', 'createdAt'],
      unique: ['id'],
      encrypted: ['profile.bio']
    };
  }
  
  /**
   * Generate test plugin with configurable behavior
   */
  static generatePlugin(options: {
    id?: string;
    hasP2PHandlers?: boolean;
    hasPubSubHandlers?: boolean;
    failOnStart?: boolean;
  } = {}): PluginInterface {
    return {
      id: options.id || `test-plugin-${Date.now()}`,
      logger: undefined as any, // Will be set by client
      started: false,
      
      p2p: options.hasP2PHandlers ? {
        '/test/echo': async function(message: any) {
          return { echo: message.payload };
        },
        '/test/error': async function() {
          throw new Error('Test error');
        }
      } : {},
      
      pubsub: options.hasPubSubHandlers ? {
        'test.broadcast': async function(message: any) {
          console.log('Received broadcast:', message);
        }
      } : {},
      
      pluginEvents: {},
      coreEvents: {},
      
      async start() {
        if (options.failOnStart) {
          throw new Error('Plugin failed to start');
        }
        this.started = true;
      },
      
      async stop() {
        this.started = false;
      }
    };
  }
  
  /**
   * Generate test identity document
   */
  static async generateIdentityDocument(options: {
    withSchemas?: boolean;
    encrypted?: boolean;
  } = {}): Promise<{
    document: any;
    cid: CID;
  }> {
    const document: any = {
      version: 1,
      created: new Date().toISOString(),
      publicKey: randomBytes(32).toString('hex'),
      profile: {
        name: `Test User ${Date.now()}`,
        bio: 'Generated test identity'
      }
    };
    
    if (options.withSchemas) {
      document.schemas = {
        'test-schema': {
          schemaId: 'test-schema',
          version: 1,
          cid: 'bafyreigdyrzt5sfp7udm7hu76uh7y26nqfn67v4ga64yjn3c2gqiihhhe'
        }
      };
    }
    
    // Create CID for the document
    const block = await Block.encode({
      value: document,
      codec: json,
      hasher: sha256
    });
    
    return {
      document,
      cid: block.cid
    };
  }
  
  /**
   * Generate Ethereum address and signature
   */
  static generateEthereumAccount(): {
    address: `0x${string}`;
    privateKey: `0x${string}`;
  } {
    const privateKey = `0x${randomBytes(32).toString('hex')}` as `0x${string}`;
    // Simple address generation (not cryptographically correct, just for testing)
    const address = `0x${randomBytes(20).toString('hex')}` as `0x${string}`;
    
    return { address, privateKey };
  }
  
  /**
   * Generate test file/block data
   */
  static async generateBlock(size: 'small' | 'medium' | 'large' = 'small'): Promise<{
    data: Uint8Array;
    cid: CID;
  }> {
    let data: Uint8Array;
    
    switch (size) {
      case 'small':
        data = randomBytes(1024); // 1KB
        break;
      case 'medium':
        data = randomBytes(1024 * 100); // 100KB
        break;
      case 'large':
        data = randomBytes(1024 * 1024); // 1MB
        break;
    }
    
    const block = await Block.encode({
      value: { data: Array.from(data) },
      codec: json,
      hasher: sha256
    });
    
    return {
      data,
      cid: block.cid
    };
  }
  
  /**
   * Generate network topology for testing
   */
  static generateNetworkTopology(nodeCount: number): {
    nodes: Array<{
      id: string;
      role: PeerRole;
      connections: string[];
    }>;
  } {
    const nodes: Array<{
      id: string;
      role: PeerRole;
      connections: string[];
    }> = [];
    
    // Create nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        id: `node-${i}`,
        role: i === 0 ? 'server' : 'peer',
        connections: []
      });
    }
    
    // Create connections (mesh for small networks, hub-spoke for larger)
    if (nodeCount <= 5) {
      // Full mesh
      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          nodes[i].connections.push(nodes[j].id);
          nodes[j].connections.push(nodes[i].id);
        }
      }
    } else {
      // Hub-spoke with server as hub
      for (let i = 1; i < nodeCount; i++) {
        nodes[0].connections.push(nodes[i].id);
        nodes[i].connections.push(nodes[0].id);
      }
      
      // Add some peer connections
      for (let i = 1; i < nodeCount - 1; i += 2) {
        nodes[i].connections.push(nodes[i + 1].id);
        nodes[i + 1].connections.push(nodes[i].id);
      }
    }
    
    return { nodes };
  }
}

/**
 * Test scenario builders for complex test cases
 */
export class TestScenarioBuilder {
  /**
   * Build a multi-client chat scenario
   */
  static async buildChatScenario(participantCount: number): Promise<{
    participants: Array<{
      did: DID;
      peerId: PeerId;
      name: string;
    }>;
    messages: Array<{
      from: string;
      to?: string;
      content: string;
      timestamp: number;
    }>;
  }> {
    const participants = await Promise.all(
      Array.from({ length: participantCount }, async (_, i) => ({
        did: await TestDataGenerators.generateDID(`participant-${i}`),
        peerId: await createEd25519PeerId(),
        name: `User ${i + 1}`
      }))
    );
    
    // Generate conversation
    const messages = [];
    const messageTemplates = [
      "Hello everyone!",
      "How's it going?",
      "Did you see the latest update?",
      "That's interesting!",
      "I agree with that",
      "Let me share something..."
    ];
    
    for (let i = 0; i < 20; i++) {
      const from = participants[Math.floor(Math.random() * participants.length)];
      const isDirectMessage = Math.random() > 0.7;
      const to = isDirectMessage 
        ? participants.find(p => p.did.id !== from.did.id)?.did.id
        : undefined;
        
      messages.push({
        from: from.did.id,
        to,
        content: messageTemplates[Math.floor(Math.random() * messageTemplates.length)],
        timestamp: Date.now() + i * 1000
      });
    }
    
    return { participants, messages };
  }
  
  /**
   * Build a file sharing scenario
   */
  static async buildFileSharingScenario(): Promise<{
    files: Array<{
      name: string;
      cid: CID;
      size: number;
      owner: string;
      sharedWith: string[];
    }>;
  }> {
    const files = [];
    
    for (let i = 0; i < 5; i++) {
      const { cid, data } = await TestDataGenerators.generateBlock(
        i % 3 === 0 ? 'large' : i % 2 === 0 ? 'medium' : 'small'
      );
      
      files.push({
        name: `test-file-${i}.dat`,
        cid,
        size: data.length,
        owner: `did:test:owner-${i}`,
        sharedWith: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, 
          (_, j) => `did:test:user-${j}`)
      });
    }
    
    return { files };
  }
}