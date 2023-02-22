import { PluginEventDef, PluginEventHandlers } from "../plugin/types";
import {
  DecodedProtocolMessage,
  EncodedProtocolPayload,
  EncodingOptions,
  ProtocolMessage,
} from "../protocol";
import { Peer } from "../p2p";
import { PeerId } from "@libp2p/interface-peer-id";

export type LibP2PPubsubMessage<
  Events extends PluginEventDef = PluginEventDef,
  Topic extends keyof Events["subscribe"] = keyof Events["subscribe"],
  Encoding extends EncodingOptions = EncodingOptions,
  Data extends EncodedProtocolPayload<
    Events["subscribe"][Topic],
    Encoding
  > = EncodedProtocolPayload<Events["subscribe"][Topic], Encoding>,
  FromType = PeerId
> = {
  type: "signed" | "unsigned";
  from: FromType;
  peer: Peer;
  sequenceNumber: number;
  topic: string;
  data: Data;
  signature?: Uint8Array;
};

export type SubscribeEvents<
  PluginEvents extends PluginEventDef = PluginEventDef
> = {
  [K in keyof PluginEvents["subscribe"]]: IncomingPubsubMessage<
    PluginEvents,
    K
  >;
};

export type SubscribeEventHandlers<
  PluginEvents extends PluginEventDef = PluginEventDef
> = PluginEventHandlers<SubscribeEvents<PluginEvents>>;

export type OutgoingPubsubMessage<
  PluginEvents extends PluginEventDef = PluginEventDef,
  Topic extends keyof PluginEvents["publish"] = keyof PluginEvents["publish"],
  Encoding extends EncodingOptions = EncodingOptions
> = ProtocolMessage<PluginEvents["publish"][Topic], Topic, Encoding>;

export type IncomingPubsubMessage<
  PluginEvents extends PluginEventDef = PluginEventDef,
  Topic extends keyof PluginEvents["subscribe"] = keyof PluginEvents["subscribe"],
  Encoding extends EncodingOptions = EncodingOptions
> = DecodedProtocolMessage<PluginEvents, "subscribe", Topic, Encoding> & {
  peer: Peer;
};
