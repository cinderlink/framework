import Emittery from "emittery";
import { PluginEventDef } from "../plugin/types";
import { PubsubMessageEvents } from "./types";

export interface PubsubInterface<PluginEvents extends PluginEventDef>
  extends Emittery<PubsubMessageEvents<PluginEvents["subscribe"]>> {
  subscriptions: string[];
  subscribe(topic: string): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  publish(topic: string, message: unknown): Promise<void>;
}
