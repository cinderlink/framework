// Core dependencies
import { createHelia } from 'helia';
import { createLibp2p } from 'libp2p';
import { FsBlockstore } from 'blockstore-fs';
import { createRemotePins, RemotePins } from '@helia/remote-pinning';

// Libp2p transports
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';

// Libp2p services
import { dcutr } from '@libp2p/dcutr';
import { kadDHT } from '@libp2p/kad-dht';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { identify } from '@libp2p/identify';
import { circuitRelayServer } from '@libp2p/circuit-relay-v2';
import { autoNAT } from '@libp2p/autonat';

// Types
import type { GossipsubOpts } from '@chainsafe/libp2p-gossipsub';
import type { Helia } from '@helia/interface';
import type { Libp2p } from 'libp2p';

/**
 * Extended Helia interface with libp2p and remote pins
 */
export interface CinderlinkHelia extends Helia {
  libp2p: Libp2p;
  remotePins: RemotePins;
  blockstore: FsBlockstore;
}

/**
 * Options for creating a Helia node with Cinderlink defaults
 */
export interface CinderlinkHeliaOptions {
  /** Custom libp2p configuration */
  libp2p?: any;
  
  /** Custom Helia configuration */
  helia?: any;
}

/**
 * Create a Helia node with Cinderlink defaults
 */
export async function createHeliaNode(
  _bootstrapNodes: string[] = [],
  overrides: CinderlinkHeliaOptions = {}
): Promise<CinderlinkHelia> {
  // Create libp2p instance with recommended configuration
  const libp2p = await createLibp2p({
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0', '/ip4/0.0.0.0/tcp/0/ws'],
    },
    transports: [tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    peerDiscovery: [
      pubsubPeerDiscovery({
        interval: 1000,
      }),
    ],
    services: {
      pubsub: gossipsub({ allowPublishToZeroTopicPeers: true } as GossipsubOpts),
      identify: identify(),
      dht: kadDHT({
        clientMode: false,
        providers: {
          cacheSize: 1000,
          cleanupInterval: 1000 * 60 * 10, // 10 minutes
          provideValidity: 1000 * 60 * 60 * 24 // 1 day
        },
        log: (message: string) => console.log(`[kad-dht] ${message}`)
      }),
      autonat: autoNAT(),
      dcutr: dcutr(),
      relay: circuitRelayServer({
        advertise: true,
      }),
    },
    ...overrides.libp2p,
  });

  // Create Helia instance with the libp2p instance
  const blockstore = new FsBlockstore();
  const helia = await createHelia({
    libp2p,
    blockstore,
    ...overrides.helia,
  });

  const remotePins = createRemotePins(helia);

  // Extend the helia instance with libp2p, remotePins, and blockstore
  const cinderlinkHelia = {
    ...helia,
    libp2p,
    remotePins,
    blockstore
  } as unknown as CinderlinkHelia;

  return cinderlinkHelia;
}

// For backward compatibility
export type { CinderlinkHelia as CinderlinkIPFS };
export type { CinderlinkHelia as IPFSWithLibP2P };
