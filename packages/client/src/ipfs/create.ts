// Core dependencies
import { createHelia, HeliaInit } from "helia";

import { createLibp2p, Libp2pOptions } from "libp2p";

import { FsBlockstore } from 'blockstore-fs';
import { createRemotePins, RemotePins } from '@helia/remote-pinning';

// Libp2p transports
import { tcp } from '@libp2p/tcp';
import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { generateKeyPair } from '@libp2p/crypto/keys';
import { peerIdFromPrivateKey } from '@libp2p/peer-id';

// Libp2p services
import { dcutr } from '@libp2p/dcutr';
import { kadDHT } from '@libp2p/kad-dht';
import { pubsubPeerDiscovery } from '@libp2p/pubsub-peer-discovery';
import { bootstrap } from '@libp2p/bootstrap';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';
import { identify } from '@libp2p/identify';
import { circuitRelayServer } from '@libp2p/circuit-relay-v2';
import { autoNAT } from '@libp2p/autonat';
import { ping } from '@libp2p/ping';

// Types
import type { CinderlinkHelia as BaseCinderlinkHelia } from '@cinderlink/core-types';

/**
 * Extended Helia interface with additional properties
 */
export interface CinderlinkHelia extends BaseCinderlinkHelia {
  remotePins: RemotePins;
}

/**
 * Options for creating a Helia node with Cinderlink defaults
 */
export interface CinderlinkHeliaOptions extends Partial<HeliaInit<any>> {
  /** Test mode - use minimal configuration to avoid native dependencies */
  testMode?: boolean;
}

/**
 * Create a Helia node with Cinderlink defaults
 */
export async function createHeliaNode(
  bootstrapNodes: string[] = [],
  overrides: CinderlinkHeliaOptions = {}
): Promise<CinderlinkHelia> {
  // In test mode, use minimal configuration to avoid native dependencies
  const isTestMode = overrides.testMode || process.env.NODE_ENV === 'test' || process.env.VITEST;
  
  // Separate testMode from the rest of the options
  const { testMode, ...heliaOptions } = overrides;
  
  // Generate a peer ID for test mode to ensure gossipsub can sign messages
  const peerId = isTestMode ? 
    peerIdFromPrivateKey(await generateKeyPair('Ed25519')) :
    undefined;
  
  // Create libp2p instance with recommended configuration
  const libp2p = await createLibp2p({
    ...(peerId ? { peerId } : {}),
    addresses: {
      listen: ['/ip4/0.0.0.0/tcp/0', '/ip4/0.0.0.0/tcp/0/ws'],
    },
    transports: [tcp()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    peerDiscovery: [
      ...(isTestMode ? [] : [
        pubsubPeerDiscovery({
          interval: 1000,
        }) as any
      ]),
      ...(bootstrapNodes.length > 0 ? [
        bootstrap({
          list: bootstrapNodes,
          timeout: 1000,
          tagName: 'bootstrap',
          tagValue: 50,
          tagTTL: 120000
        }) as any
      ] : [])
    ],
    services: {
      pubsub: gossipsub({
        allowPublishToZeroPeers: true,
        ...(isTestMode ? {
          // Disable message signing in test mode
          globalSignaturePolicy: 'StrictNoSign' as const,
          scoreParams: {
            IPColocationFactorThreshold: Infinity,
            behaviourPenaltyThreshold: Infinity,
          },
          scoreThresholds: {
            gossipThreshold: -Infinity,
            publishThreshold: -Infinity,
            graylistThreshold: -Infinity,
            acceptPXThreshold: -Infinity,
            opportunisticGraftThreshold: -Infinity,
          }
        } : {})
      }),
      identify: identify(),
      ping: ping(),
      ...(isTestMode ? {} : {
        dht: kadDHT({
          clientMode: false,
          providers: {
            cacheSize: 1000,
            cleanupInterval: 1000 * 60 * 10, // 10 minutes
            provideValidity: 1000 * 60 * 60 * 24 // 1 day
          }
        }),
        autonat: autoNAT(),
        dcutr: dcutr(),
        relay: circuitRelayServer({
          hopTimeout: 30 * 1000,
          reservations: {
            maxReservations: 15
          }
        }),
      }),
    } as any,
    ...heliaOptions.libp2p,
  });

  // Create Helia instance with the libp2p instance
  const blockstore = new FsBlockstore(isTestMode ? './test-blockstore' : './blockstore');
  const helia = await createHelia({
    libp2p,
    blockstore,
    ...heliaOptions,
  });

  const remotePins = createRemotePins(helia);

  // Extend the helia instance with remotePins
  const cinderlinkHelia = {
    ...helia,
    remotePins
  } as CinderlinkHelia;

  return cinderlinkHelia;
}

// For backward compatibility
export type { CinderlinkHelia as CinderlinkIPFS };
export type { CinderlinkHelia as IPFSWithLibP2P };
