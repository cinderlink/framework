import {
  EncodingOptions,
  PluginEventDef,
  PluginInterface,
  OutgoingP2PMessage,
  IncomingP2PMessage,
} from "@cinderlink/core-types";
import { OfflineSyncClientEvents } from "./types";

export interface OfflineSyncClientPluginInterface
  extends PluginInterface<OfflineSyncClientEvents> {
  sendMessage<
    Events extends PluginEventDef = PluginEventDef,
    OutTopic extends keyof Events["send"] = keyof Events["send"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    recipient: string,
    outgoing: OutgoingP2PMessage<Events, OutTopic, Encoding>
  ): Promise<
    IncomingP2PMessage<
      OfflineSyncClientEvents,
      "/offline/send/response",
      Encoding
    >
  >;
}
