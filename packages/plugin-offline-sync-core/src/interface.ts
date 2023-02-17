import {
  EncodedP2PMessage,
  P2PMessage,
  PluginEventDef,
  PluginInterface,
} from "@candor/core-types";
import { OfflineSyncClientEvents } from "./types";

export interface OfflineSyncClientPluginInterface
  extends PluginInterface<OfflineSyncClientEvents> {
  sendMessage<
    E extends PluginEventDef["send"] = PluginEventDef["send"],
    K extends keyof E = keyof E
  >(
    recipient: string,
    encoded: EncodedP2PMessage<E, K>
  ): Promise<P2PMessage>;
}
