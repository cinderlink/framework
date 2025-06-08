declare module '@libp2p/blockstore-fs' {
  import { Blockstore } from 'interface-blockstore';
  export class FsBlockstore extends Blockstore {
    constructor(path?: string);
  }
}

declare module '@libp2p/tcp' {
  import { Transport } from '@libp2p/interface-transport';
  export function tcp(): () => Transport;
}

declare module '@libp2p/mplex' {
  import { StreamMuxerFactory } from '@libp2p/interface-stream-muxer';
  export function mplex(): () => StreamMuxerFactory;
}

declare module '@libp2p/dcutr' {
  import { ComponentLogger } from '@libp2p/interface';
  export function dcutr(init?: { logger?: ComponentLogger }): any;
}

declare module '@libp2p/kad-dht' {
  import { ComponentLogger } from '@libp2p/interface';
  export function kadDHT(options: {
    clientMode?: boolean;
    kBucketSize?: number;
    maxInboundStreams?: number;
    maxOutboundStreams?: number;
    pingTimeout?: number;
    pingConcurrency?: number;
    protocolPrefix?: string;
    querySelfInterval?: number;
    providers: {
      cacheSize?: number;
      cleanupInterval?: number;
      provideValidity?: number;
    };
    validators?: any;
    selectors?: any;
    queryPathFilter?: any;
    lan?: boolean;
    protocol?: string;
    log: (message: string, level?: string) => void;
  }): any;
}

declare module '@libp2p/pubsub-peer-discovery' {
  import { PeerDiscovery } from '@libp2p/interface-peer-discovery';
  export function pubsubPeerDiscovery(options: {
    interval?: number;
    topics?: string[];
    listenOnly?: boolean;
    protocol?: string;
  }): () => PeerDiscovery;
}

declare module '@libp2p/identify' {
  import { ComponentLogger } from '@libp2p/interface';
  export function identify(init?: { protocolPrefix?: string; logger?: ComponentLogger }): any;
}

declare module '@libp2p/circuit-relay-v2' {
  import { ComponentLogger } from '@libp2p/interface';
  export function circuitRelayServer(init?: { 
    advertise?: boolean;
    hopTimeout?: number;
    advertise: { bootDelay?: number; enabled?: boolean; ttl?: number };
    logger?: ComponentLogger;
  }): any;
}

declare module '@libp2p/autonat' {
  import { ComponentLogger } from '@libp2p/interface';
  export function autoNAT(init?: { 
    protocolPrefix?: string;
    maxInboundStreams?: number;
    maxOutboundStreams?: number;
    timeout?: number;
    startupDelay?: number;
    refreshInterval?: number;
    logger?: ComponentLogger;
  }): any;
}
