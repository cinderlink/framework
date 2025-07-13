import { PeerId } from "@libp2p/interface";
import { PluginEventDef, PluginEventHandlers } from "../plugin/types";
import {
  DecodedProtocolMessage,
  OutgoingProtocolMessage,
  EncodingOptions,
} from "../protocol/types";

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
  PluginEvents extends PluginEventDef = PluginEventDef,
  Encoding extends EncodingOptions = EncodingOptions
> = {
  [K in keyof PluginEvents["receive"]]: IncomingP2PMessage<
    PluginEvents,
    K,
    Encoding
  >;
};

export type ReceiveEventHandlers<PluginEvents extends PluginEventDef = PluginEventDef> =
  PluginEventHandlers<ReceiveEvents<PluginEvents>>;

export type OutgoingP2PMessage<
  PluginEvents extends PluginEventDef = PluginEventDef,
  Topic extends keyof PluginEvents["send"] = keyof PluginEvents["send"]
> = OutgoingProtocolMessage<PluginEvents["send"][Topic], Topic>;

export type IncomingP2PMessage<
  PluginEvents extends PluginEventDef = PluginEventDef,
  Topic extends keyof PluginEvents["receive"] = keyof PluginEvents["receive"],
  Encoding extends EncodingOptions = EncodingOptions
> = DecodedProtocolMessage<PluginEvents, "receive", Topic, Encoding> & {
  peer: Peer;
};
