import type { Peer, PeerStoreInterface } from "@cinderlink/core-types";
import type { PeerId } from "@libp2p/interface";

export class Peerstore implements PeerStoreInterface {
  peers: Record<string, Peer> = {};
  peerIds: Record<string, string> = {};
  localPeerId: string = "";

  constructor(localPeerId: string) {
    this.localPeerId = localPeerId;
  }

  addPeer(peerId: PeerId, role: "server" | "peer" = "peer", did?: string) {
    if (this.peers[peerId.toString()]) {
      throw new Error("peer already exists");
    }
    if (did) {
      this.peerIds[did] = peerId.toString();
    }

    this.peers[peerId.toString()] = {
      did,
      peerId,
      role,
      subscriptions: [],
      metadata: {},
      connected: false,
    };
    return this.peers[peerId.toString()];
  }

  hasPeer(peerId: string) {
    return !!this.peers[peerId.toString()];
  }

  hasServer(peerId: string) {
    return this.getPeer(peerId)?.role === "server" ? true : false;
  }

  getServers() {
    return Object.values(this.peers).filter((peer) => peer.role === "server");
  }

  getServerCount() {
    return Object.values(this.peers).filter((peer) => peer.role === "server")
      .length;
  }

  getPeers() {
    return Object.values(this.peers).filter((peer) => peer.role === "peer");
  }

  getAllPeers(): Peer[] {
    return Object.values(this.peers);
  }

  peerCount() {
    return Object.keys(this.peers).length;
  }

  allPeerCount(): number {
    return Object.keys(this.peers).length;
  }

  removePeer(peerId: string) {
    delete this.peers[peerId.toString()];
  }

  getPeer(peerId: string) {
    return this.peers[peerId.toString()];
  }

  updatePeer(peerId: string, peer: Partial<Peer>) {
    this.peers[peerId.toString()] = {
      ...this.peers[peerId.toString()],
      ...peer,
    };
    if (peer.did) this.peerIds[peer.did] = peerId.toString();
  }

  setMetadata(peerId: string, key: string, value: string) {
    if (!this.peers[peerId.toString()]) {
      throw new Error("peer not found");
    }
    this.peers[peerId.toString()].metadata[key] = value;
  }

  isConnected(peerId: string) {
    return this.peers[peerId.toString()]?.connected;
  }

  isDIDConnected(did: string) {
    return this.peers[this.peerIds[did]]?.connected;
  }

  hasPeerByDID(did: string) {
    return !!this.peerIds[did];
  }

  getPeerByDID(did: string) {
    if (!this.hasPeerByDID(did)) {
      return undefined;
    }

    return this.peers[this.peerIds[did]];
  }

  getPeerIdByDID(did: string) {
    if (!this.hasPeerByDID(did)) {
      return undefined;
    }

    return this.peerIds[did];
  }

  getDIDByPeerId(peerId: string) {
    return this.peers[peerId.toString()]?.did;
  }
}

export default Peerstore;
