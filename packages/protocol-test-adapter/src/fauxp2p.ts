import type { Libp2p } from "libp2p";

export class FauxP2P implements Libp2p {
  peerId;
  peerStore;
  peerRouting;
  contentRouting;
  keychain;
  metrics?;
  pubsub;
  dht;
  fetchService;
  identifyService: { host: { protocolVersion: string; agentVersion: string } };
  getMultiaddrs;
  getProtocols: () => string[];
  getConnections;
  getPeers;
  dial;
  dialProtocol;
  hangUp;
  handle;
  unhandle: (protocols: string | string[]) => Promise<void>;
  register;
  unregister: (id: string) => void;
  ping;
  fetch;
  getPublicKey;
  isStarted: () => boolean;
  beforeStart?: (() => void | Promise<void>) | undefined;
  start: () => void | Promise<void>;
  afterStart?: (() => void | Promise<void>) | undefined;
  beforeStop?: (() => void | Promise<void>) | undefined;
  stop: () => void | Promise<void>;
  afterStop?: (() => void | Promise<void>) | undefined;
  #private: any;
  listenerCount(type: string): number {
    throw new Error("Method not implemented.");
  }
  dispatchEvent(event: Event): boolean {
    throw new Error("Method not implemented.");
  }
}
