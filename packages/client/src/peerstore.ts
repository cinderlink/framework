import { PeerId } from "@libp2p/interface-peer-id";
import { fromPeerId } from "./did/util";

export type Peer = {
  did: string;
  subscriptions: string[];
  metadata: Record<string, string>;
  connected: boolean;
  handshake: boolean;
};

export class Peerstore {
  peers: Record<string, Peer> = {};
  idMap: Record<string, string> = {};

  addPeer(did: string, peerId: string) {
    this.idMap[peerId] = did;
    this.peers[did] = {
      did,
      subscriptions: [],
      metadata: {},
      connected: false,
      handshake: false,
    };
    return this.peers[did];
  }

  hasPeer(did: string) {
    return !!this.peers[did];
  }

  peerCount() {
    return Object.keys(this.peers).length;
  }

  addPeerByPeerId(peerId: PeerId) {
    const did = fromPeerId(peerId);
    return this.addPeer(did, peerId.toString());
  }

  hasPeerWithPeerId(peerId: PeerId | string) {
    return !!this.idMap[peerId.toString()];
  }

  getPeerByPeerId(peerId: PeerId | string) {
    if (!this.hasPeerWithPeerId(peerId))
      return this.addPeerByPeerId(peerId as PeerId);
    return this.peers[this.idMap[peerId.toString()]];
  }

  removePeer(did: string) {
    delete this.peers[did];
  }

  getPeer(did: string) {
    return this.peers[did];
  }

  updatePeer(did: string, peer: Partial<Peer>) {
    this.peers[did] = {
      ...this.peers[did],
      ...peer,
    };
  }

  setMetadata(did: string, key: string, value: string) {
    if (!this.peers[did]) {
      throw new Error("peer not found");
    }
    this.peers[did].metadata[key] = value;
  }

  isConnected(did: string) {
    return this.peers[did]?.connected;
  }
}
