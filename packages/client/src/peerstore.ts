import type { PeerId } from "@libp2p/interface";
import type { Peer, PeerStoreInterface, PeerRole } from "@cinderlink/core-types";

export class Peerstore implements PeerStoreInterface {
  peers: Record<string, Peer> = {};
  peerIds: Record<string, string> = {};

  constructor(public localPeerId: string) {}

  addPeer(peerId: PeerId, role: PeerRole = "peer", did?: string): Peer {
    if (peerId.toString() === this.localPeerId) {
      throw new Error("cannot add self as peer");
    }
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
      seenAt: Date.now(),
    };
    const peer = this.peers[peerId.toString()];
    if (!peer) {
      throw new Error(`Failed to retrieve peer ${peerId.toString()}`);
    }
    return peer;
  }

  hasPeer(peerId: string) {
    return !!this.peers[peerId.toString()];
  }

  hasServer(peerId: string) {
    const peer = this.peers[peerId.toString()];
    return peer?.role === "server" ? true : false;
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

  getAllPeers() {
    return Object.values(this.peers);
  }

  peerCount() {
    return this.getPeers().length;
  }

  allPeerCount() {
    return this.getAllPeers().length;
  }

  removePeer(peerId: string) {
    delete this.peers[peerId.toString()];
  }

  getPeer(peerId: string): Peer {
    const peer = this.peers[peerId.toString()];
    if (!peer) {
      throw new Error(`Peer ${peerId.toString()} not found`);
    }
    return peer;
  }

  updatePeer(peerId: string, peer: Partial<Peer>) {
    const existingPeer = this.peers[peerId.toString()];
    if (!existingPeer) {
      throw new Error(`Peer ${peerId.toString()} not found`);
    }
    this.peers[peerId.toString()] = {
      ...existingPeer,
      ...peer,
    };
    if (peer.did) this.peerIds[peer.did] = peerId.toString();
  }

  setMetadata(peerId: string, key: string, value: string) {
    const peer = this.peers[peerId.toString()];
    if (!peer) {
      throw new Error("peer not found");
    }
    peer.metadata[key] = value;
  }

  isConnected(peerId: string): boolean {
    const peer = this.peers[peerId.toString()];
    return peer ? peer.connected || false : false;
  }

  isDIDConnected(did: string): boolean {
    const peerId = this.peerIds[did];
    if (!peerId) return false;
    const peer = this.peers[peerId];
    return peer ? peer.connected || false : false;
  }

  hasPeerByDID(did: string) {
    return !!this.peerIds[did];
  }

  getPeerByDID(did: string) {
    if (!this.hasPeerByDID(did)) {
      return undefined;
    }

    const peerId = this.peerIds[did];
    return peerId ? this.peers[peerId] : undefined;
  }

  getPeerIdByDID(did: string) {
    if (!this.hasPeerByDID(did)) {
      return undefined;
    }

    return this.peerIds[did];
  }

  getDIDByPeerId(peerId: string) {
    const peer = this.peers[peerId.toString()];
    return peer?.did;
  }
}
