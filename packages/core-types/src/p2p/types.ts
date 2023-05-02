import { PeerId } from "@libp2p/interface-peer-id";
import { PluginEventDef, PluginEventHandlers } from "../plugin/types";
import { EncodingOptions, ProtocolMessage } from "../protocol/types";

export type Peer = {
  did?: string;
  peerId: PeerId;
  role: "server" | "peer";
  subscriptions: string[];
  metadata: Record<string, string>;
  connected: boolean;
  connectedAt?: number;
  disconnectedAt?: number;
  seenAt?: number;
};

export type PeerRole = "server" | "peer";

export type P2PCoreEvents = {
  "/peer/connect": Peer;
  "/peer/disconnect": Peer;
  "/server/connect": Peer;
  "/server/disconnect": Peer;
};

export type ReceiveEvents<
  PluginEvents extends PluginEventDef = any,
  Encoding extends EncodingOptions = EncodingOptions
> = {
  [K in keyof PluginEvents["receive"]]: IncomingP2PMessage<
    PluginEvents,
    K,
    Encoding
  >;
};

export type ReceiveEventHandlers<PluginEvents extends PluginEventDef = any> =
  PluginEventHandlers<ReceiveEvents<PluginEvents>>;

export type OutgoingP2PMessage<
  PluginEvents extends PluginEventDef = any,
  Topic extends keyof PluginEvents["send"] = keyof PluginEvents["send"],
  Encoding extends EncodingOptions = { sign: false; encrypt: false }
> = ProtocolMessage<PluginEvents["send"][Topic], Topic, Encoding>;

export type IncomingP2PMessage<
  PluginEvents extends PluginEventDef = any,
  Topic extends keyof PluginEvents["receive"] = keyof PluginEvents["receive"],
  Encoding extends EncodingOptions = { sign: false; encrypt: false }
> = ProtocolMessage<PluginEvents["receive"][Topic], Topic, Encoding> & {
  peer: Peer;
  signed: Encoding["sign"];
  encrypted: Encoding["encrypt"];
  recipients?: Encoding["recipients"];
};
