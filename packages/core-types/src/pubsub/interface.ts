import Emittery from "emittery";
import { PluginEventDef } from "../plugin/types";
import { SubscribeEvents } from "./types";

export interface PubsubInterface<PluginEvents extends PluginEventDef>
  extends Emittery<SubscribeEvents<PluginEvents>> {
  subscriptions: string[];
  subscribe(topic: string): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  publish(topic: string, message: unknown): Promise<void>;
}
