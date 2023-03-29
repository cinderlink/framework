import type { Peer, PeerStoreInterface } from "@cinderlink/core-types";
import { PeerId } from "@libp2p/interface-peer-id";

export class Peerstore implements PeerStoreInterface {
  peers: Record<string, Peer> = {};
  peerIds: Record<string, string> = {};

  addPeer(peerId: PeerId, role: "server" | "peer" = "peer", did?: string) {
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
      authenticated: false,
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

  peerCount() {
    return this.getPeers().length;
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

  isAuthenticated(peerId: string) {
    return this.peers[peerId.toString()]?.authenticated || false;
  }

  isDIDAuthenticated(did: string) {
    return this.peers[this.peerIds[did]]?.authenticated || false;
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
