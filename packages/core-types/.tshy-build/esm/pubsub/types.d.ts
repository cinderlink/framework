import * as json from "multiformats";
import { PluginEventDef, PluginEventHandlers } from "../plugin/types";
import { DecodedProtocolMessage, EncodedProtocolPayload, ProtocolMessage, EncodingOptions } from "../protocol";
import { Peer } from "../p2p";
import { PeerId } from "@libp2p/interface";
export type LibP2PPubsubMessage<Events extends PluginEventDef = PluginEventDef, Topic extends keyof Events["subscribe"] = keyof Events["subscribe"], Data extends EncodedProtocolPayload<Events["subscribe"][Topic]> = EncodedProtocolPayload<Events["subscribe"][Topic]>, FromType = PeerId> = {
    type: "signed" | "unsigned";
    from: FromType;
    peer: Peer;
    sequenceNumber: number;
    topic: keyof Events["subscribe"];
    data: json.ByteView<Data>;
    signature?: Uint8Array;
};
export type SubscribeEvents<PluginEvents extends PluginEventDef = PluginEventDef, Encoding extends EncodingOptions = EncodingOptions> = {
    [K in keyof PluginEvents["subscribe"]]: IncomingPubsubMessage<PluginEvents, K, Encoding>;
};
export type SubscribeEventHandlers<PluginEvents extends PluginEventDef = PluginEventDef> = PluginEventHandlers<SubscribeEvents<PluginEvents>>;
export type OutgoingPubsubMessage<PluginEvents extends PluginEventDef = PluginEventDef, Topic extends keyof PluginEvents["publish"] = keyof PluginEvents["publish"], Encoding extends EncodingOptions = EncodingOptions> = ProtocolMessage<PluginEvents["publish"][Topic], Topic, Encoding>;
export type IncomingPubsubMessage<PluginEvents extends PluginEventDef = PluginEventDef, Topic extends keyof PluginEvents["subscribe"] = keyof PluginEvents["subscribe"], Encoding extends EncodingOptions = EncodingOptions> = DecodedProtocolMessage<PluginEvents, "subscribe", Topic, Encoding> & {
    peer: Peer;
};
