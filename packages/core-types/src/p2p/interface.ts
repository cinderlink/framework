import type { PeerId } from "@libp2p/interface-peer-id";
import { Peer } from "./types";

export interface PeerStoreInterface {
  peers: Record<string, Peer>;
  peerIds: Record<string, string>;
  localPeerId: string;
  addPeer(peerId: PeerId, role: "server" | "peer"): Peer;
  hasPeer(peerId: string): boolean;
  hasServer(peerId: string): boolean;
  getServers(): Peer[];
  getServerCount(): number;
  getPeers(): Peer[];
  getAllPeers(): Peer[];
  peerCount(): number;
  allPeerCount(): number;
  removePeer(peerId: string): void;
  getPeer(peerId: string): Peer;
  updatePeer(peerId: string, peer: Partial<Peer>): void;
  setMetadata(peerId: string, key: string, value: string): void;
  isConnected(peerId: string): boolean;
  isDIDConnected(did: string): boolean;

  hasPeerByDID(did: string): boolean;
  getPeerByDID(did: string): Peer | undefined;
  getPeerIdByDID(did: string): string | undefined;
  getDIDByPeerId(peerId: string): string | undefined;
}
