import { HandshakedPeer } from "./../p2p/types";
import { PeerId } from "@libp2p/interface-peer-id";
import { PluginEventPayloads } from "../plugin/types";
import { DagJWS } from "dids";
import { JWE } from "did-jwt";

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

export type PubsubEncodingType = "signed" | "json" | "encrypted";
export type PubsubEncodedPayload<PubsubEncodingType> =
  PubsubEncodingType extends "signed"
    ? DagJWS
    : PubsubEncodingType extends "json"
    ? Record<string, unknown>
    : PubsubEncodingType extends "encrypted"
    ? JWE
    : never;

export type PubsubEncodedMessage<
  Type extends PubsubEncodingType = PubsubEncodingType
> = {
  type: Type;
  from: string;
  recipients?: string[];
  cid?: string;
  payload?: PubsubEncodedPayload<Type>;
};
