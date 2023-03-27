import { EncodingOptions, ProtocolPayload } from "./../protocol/types";
import { ReceiveEventHandlers } from "./../p2p/types";
import { SubscribeEventHandlers } from "../pubsub";
import { CinderlinkClientEvents, CinderlinkClientInterface } from "../client";

export type PluginEventPayloads<
  T extends Record<string, unknown> = Record<string, unknown>
> = Record<keyof T, ProtocolPayload<T[keyof T], EncodingOptions>>;
export type PluginEventHandler<T = unknown> = (payload: T) => void;
export type PluginEventHandlers<
  Events extends PluginEventDef[keyof PluginEventDef]
> = {
  [key in keyof Events]: PluginEventHandler<Events[key]>;
};

export interface PluginEventDef {
  send: PluginEventPayloads;
  receive: PluginEventPayloads;
  publish: PluginEventPayloads;
  subscribe: PluginEventPayloads;
  emit: PluginEventPayloads;
}

export interface PluginInterface<
  PluginEvents extends PluginEventDef = PluginEventDef,
  Client extends CinderlinkClientInterface<any> = CinderlinkClientInterface
> {
  id: string;
  client: Client;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  pubsub: SubscribeEventHandlers<PluginEvents>;
  p2p: ReceiveEventHandlers<PluginEvents>;
  coreEvents?: Partial<PluginEventHandlers<CinderlinkClientEvents["emit"]>>;
  pluginEvents?: Partial<PluginEventHandlers<PluginEvents["emit"]>>;
}
export default PluginInterface;

export type PluginConstructor<
  Client extends CinderlinkClientInterface = CinderlinkClientInterface,
  Options extends Record<string, unknown> = {}
> = new (client: Client, options?: Options) => PluginInterface;
