import Emittery from "emittery";
import type { PeerId } from "@libp2p/interface-peer-id";
import { PluginEventPayloads } from "../plugin/types";
import { P2PCoreEvents, P2PMessageEvents, Peer, PeerRole } from "./types";

export interface P2PInterface<MessageEvents extends PluginEventPayloads>
  extends Emittery<P2PCoreEvents & P2PMessageEvents<MessageEvents>> {
  peers: Record<string, Peer>;
  idMap: Record<string, string>;
  addPeer(did: string, peerId: string, role: PeerRole): Peer;
  hasPeer(did?: string): boolean;
  hasServer(did?: string): boolean;
  getServers(): Peer[];
  getPeers(): Peer[];
  peerCount(): number;
  connectedCount(): number;
  removePeer(did: string): void;
  getPeer(did: string): Peer;
  updatePeer(did: string, peer: Partial<Peer>): void;
  setMetadata(did: string, key: string, value: string): void;
  isConnected(did: string): boolean;
}

export interface PeerStoreInterface {
  peers: Record<string, Peer>;
  idMap: Record<string, string>;
  addPeer(did: string, peerId: string, role: "server" | "peer"): Peer;
  hasPeer(did: string): boolean;
  hasServer(): boolean;
  getServers(): Peer[];
  getPeers(): Peer[];
  peerCount(): number;
  addPeerByPeerId(peerId: PeerId): Peer;
  hasPeerWithPeerId(peerId: PeerId | string): boolean;
  getPeerByPeerId(peerId: PeerId | string): Peer;
  removePeer(did: string): void;
  getPeer(did: string): Peer;
  updatePeer(did: string, peer: Partial<Peer>): void;
  setMetadata(did: string, key: string, value: string): void;
  isConnected(did: string): boolean;
}
