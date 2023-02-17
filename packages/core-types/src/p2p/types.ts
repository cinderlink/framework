import { JWE } from "did-jwt";
import { PeerId } from "@libp2p/interface-peer-id";
import { DagJWS } from "dids";
import { PluginEventDef, PluginEventPayloads } from "../plugin/types";

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
    K extends string ? K : never,
    Payloads[K] extends Record<string, unknown> ? Payloads[K] : never
  >;
};

export type HandshakeRequest = {
  did: string;
  protocols?: string[];
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
  EventDef extends PluginEventDef["send"] = PluginEventDef["send"],
  EventKey extends keyof EventDef = keyof EventDef
> = {
  topic: EventKey;
  data: EventDef[EventKey];
  signed?: boolean;
  encrypted?: boolean;
};

export type EncodedP2PMessage<
  EventDef extends PluginEventDef["send"] = PluginEventDef["send"],
  EventKey extends keyof EventDef = keyof EventDef
> = {
  topic: EventKey;
  payload: DagJWS | JWE | EventDef[EventKey];
  signed?: boolean;
  encrypted?: boolean;
};

export type P2PEventMessage<
  EventDef extends PluginEventDef["send"] = PluginEventDef["send"],
  EventKey extends keyof EventDef = keyof EventDef
> = P2PMessage<
  EventKey extends string ? EventKey : never,
  EventDef[EventKey] extends Record<string, unknown>
    ? EventDef[EventKey]
    : never
>;

export type P2PMessage<
  EventKey extends string = string,
  Data extends Record<string, unknown> = Record<string, unknown>
> = {
  topic: EventKey;
  peer: Peer;
  data: Data;
  signed?: boolean;
  encrypted?: boolean;
  signature?: string;
};

export type EncodingOptions = {
  sign?: boolean;
  encrypt?: boolean;
  recipients?: string[];
};
