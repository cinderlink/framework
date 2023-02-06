import { HandshakedPeer } from "./../p2p/types";
import { PeerId } from "@libp2p/interface-peer-id";
import { PluginEventPayloads } from "../plugin/types";

export type PubsubCoreEvents = {
  "/pubsub/subscribe": {};
};

export type PubsubMessage<Data = any, FromType = PeerId> = {
  type: "signed" | "unsigned";
  from: FromType;
  peer: HandshakedPeer;
  sequenceNumber: number;
  topic: string;
  data: Data;
  signature?: Uint8Array;
};

export type PubsubMessageEvents<
  Payloads extends PluginEventPayloads = PluginEventPayloads
> = {
  [key in keyof Payloads]: PubsubMessage<Payloads[key]>;
};
