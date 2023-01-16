import { Peer } from "../p2p";
import { PluginEventPayloads } from "../plugin/types";

export type PubsubCoreEvents = {
  "/pubsub/subscribe": {};
};

export type PubsubMessage<Data = any, FromType = any> = {
  type: "signed" | "unsigned";
  from: FromType;
  peer: Peer;
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
