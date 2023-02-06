import { JWE } from "did-jwt";
import { PeerId } from "@libp2p/interface-peer-id";
import { DagJWS } from "dids";
import { PluginEventPayloads } from "../plugin/types";

export type Peer = {
  did?: string;
  peerId: PeerId;
  role: "server" | "peer";
  subscriptions: string[];
  metadata: Record<string, string>;
  connected: boolean;
  challenge?: string;
  challengedAt?: number;
  authenticated: boolean;
  authenticatedAt?: number;
};

export type HandshakedPeer = Peer & {
  handshake: true;
  did: string;
};

export type PeerRole = "server" | "peer";

export type P2PCoreEvents = {
  "/peer/connect": Peer;
  "/peer/disconnect": Peer;
  "/server/connect": Peer;
  "/server/disconnect": Peer;
};

export type P2PMessageEvents<
  Payloads extends PluginEventPayloads = PluginEventPayloads
> = {
  [K in keyof Payloads]: P2PMessage<
    Payloads[K] extends Record<string, unknown> ? Payloads[K] : never
  >;
};

export type HandshakeRequest = {
  did: string;
};

export type HandshakeChallenge = {
  challenge: string;
};

export type HandshakeComplete = {
  challenge: string;
};

export type HandshakeSuccess = {};

export type HandshakeError = {
  error: string;
};

export type OutgoingP2PMessage<
  Data extends Record<string, unknown> = Record<string, unknown>
> = {
  topic: string;
  data: Data;
  signed?: boolean;
  encrypted?: boolean;
};

export type EncodedP2PMessage<
  Data extends Record<string, unknown> = Record<string, unknown>
> = {
  topic: string;
  payload: DagJWS | JWE | Data;
  signed?: boolean;
  encrypted?: boolean;
};

export type P2PMessage<
  Data extends Record<string, unknown> = Record<string, unknown>
> = {
  topic: string;
  peer: Peer;
  peerId: PeerId;
  data: Data;
  signed?: boolean;
  encrypted?: boolean;
  signature?: string;
};
