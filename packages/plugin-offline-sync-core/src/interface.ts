import {
  EncodingOptions,
  PluginEventDef,
  PluginInterface,
  OutgoingP2PMessage,
} from "@candor/core-types";
import { OfflineSyncClientEvents } from "./types";

export interface OfflineSyncClientPluginInterface
  extends PluginInterface<OfflineSyncClientEvents> {
  sendMessage<
    Events extends PluginEventDef = PluginEventDef,
    Topic extends keyof Events["send"] = keyof Events["send"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    recipient: string,
    encoded: OutgoingP2PMessage<Events, Topic, Encoding>
  ): Promise<void>;
}
