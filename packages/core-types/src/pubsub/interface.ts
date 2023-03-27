import Emittery from "emittery";
import { PluginEventDef } from "../plugin/types";
import { SubscribeEvents } from "./types";

export interface PubsubInterface<PluginEvents extends PluginEventDef>
  extends Emittery<SubscribeEvents<PluginEvents>> {
  subscriptions: string[];
  subscribe(topic: keyof PluginEvents["subscribe"]): Promise<void>;
  unsubscribe(topic: keyof PluginEvents["subscribe"]): Promise<void>;
  publish(
    topic: keyof PluginEvents["publish"],
    message: PluginEvents["publish"][keyof PluginEvents["publish"]]
  ): Promise<void>;
}
