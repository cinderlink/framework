import { describe, beforeEach, afterEach, vi, expect } from 'vitest';
import { CID } from 'multiformats';
import { TestClient } from '@cinderlink/test-adapters';
import { IdentityServerPlugin } from '../plugin';
import type { IdentityPinsRecord } from '../plugin';
import { DID } from 'dids';

export interface TestIdentity {
  did: string;
  cid: string;
  data: Record<string, unknown>;
}

export class IdentityServerTestUtils {
  private static cleanup: Array<() => void | Promise<void>> = [];

  static setupTestEnvironment() {
    beforeEach(() => {
      // Reset cleanup array
      this.cleanup = [];
    });

    afterEach(async () => {
      // Run all cleanup functions
      await Promise.all(this.cleanup.map(fn => fn()));
      this.cleanup = [];
    });
  }

  static addCleanup(fn: () => void | Promise<void>) {
    this.cleanup.push(fn);
  }

  static async createTestClient(): Promise<TestClient> {
    const did = { id: `did:test:${Date.now()}` } as DID;
    const client = new TestClient(did);
    
    // Mock IPFS structure
    client.ipfs = {
      blockstore: {
        get: vi.fn(),
        put: vi.fn(),
        has: vi.fn(),
        delete: vi.fn()
      },
      pins: {
        add: vi.fn(),
        rm: vi.fn(),
        ls: vi.fn()
      }
    };
    
    this.addCleanup(() => client.stop());
    return client;
  }

  static async createIdentityServerPlugin(client?: TestClient): Promise<{
    client: TestClient;
    plugin: IdentityServerPlugin;
  }> {
    const testClient = client || await this.createTestClient();
    const plugin = new IdentityServerPlugin(testClient);
    
    this.addCleanup(() => plugin.stop());
    return { client: testClient, plugin };
  }

  static generateTestIdentity(suffix = ''): TestIdentity {
    const did = `did:key:test${suffix}${Date.now()}`;
    const data = {
      name: `Test User ${suffix}`,
      avatar: `https://example.com/avatar${suffix}.png`,
      bio: `Test user ${suffix} biography`,
      created: Date.now()
    };
    
    // Generate realistic CID for test data
    const cid = `bafkreih4ph6gqgdx7yw3r6praqcp2nct5xdxy2vwqtjhgxlk6zvd4xo${suffix.padStart(3, '0')}`;
    
    return { did, cid, data };
  }

  static createMockRecord(identity: TestIdentity): IdentityPinsRecord {
    return {
      id: Math.floor(Math.random() * 10000),
      uid: identity.did.split(':').pop() || 'unknown',
      name: (identity.data.name as string) || 'Unknown',
      avatar: (identity.data.avatar as string) || '',
      did: identity.did,
      cid: identity.cid
    };
  }

  static async assertPluginStarted(plugin: IdentityServerPlugin) {
    expect(plugin.started).toBe(true);
    expect(plugin.client.hasSchema('identity')).toBe(true);
  }

  static async assertIdentityStored(
    client: TestClient, 
    did: string, 
    expectedCid?: string
  ) {
    const schema = client.getSchema('identity');
    expect(schema).toBeDefined();
    
    const table = schema!.getTable<IdentityPinsRecord>('pins');
    const record = await table.query()
      .where('did', '=', did)
      .select()
      .execute()
      .then(r => r.first());
    
    if (expectedCid) {
      expect(record).toBeDefined();
      expect(record!.cid).toBe(expectedCid);
    } else {
      expect(record?.cid).toBeUndefined();
    }
  }

  static createMockIncomingMessage(
    payload: any,
    peer: { peerId: string; did?: string } = { peerId: 'test-peer-id' }
  ) {
    return {
      payload,
      peer: {
        peerId: { toString: () => peer.peerId },
        did: peer.did
      },
      signature: Buffer.from('mock-signature'),
      from: peer.peerId
    };
  }

  static async waitForAsyncOperation(ms = 100) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  static mockCIDParsing() {
    const mockCID = {
      toString: () => 'bafkreimockcidhash',
      bytes: new Uint8Array([1, 2, 3, 4])
    };
    
    vi.spyOn(CID, 'parse').mockReturnValue(mockCID as any);
    this.addCleanup(() => vi.restoreAllMocks());
    
    return mockCID;
  }
}

// Common test data
export const TEST_IDENTITIES = {
  alice: {
    did: 'did:key:alice123',
    cid: 'bafkreialicehash123',
    data: { name: 'Alice', avatar: 'https://example.com/alice.png' }
  },
  bob: {
    did: 'did:key:bob456',
    cid: 'bafkreibobhash456',
    data: { name: 'Bob', avatar: 'https://example.com/bob.png' }
  },
  charlie: {
    did: 'did:key:charlie789',
    cid: 'bafkreicharliehash789',
    data: { name: 'Charlie', avatar: 'https://example.com/charlie.png' }
  }
};