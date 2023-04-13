import { EncodingOptions, ProtocolPayload } from "./../protocol/types";
import { ReceiveEventHandlers } from "./../p2p/types";
import { SubscribeEventHandlers } from "../pubsub";
import { CinderlinkClientEvents, CinderlinkClientInterface } from "../client";

export type PluginEventPayloads<T extends Record<string, unknown> = any> =
  Record<keyof T, ProtocolPayload<T[keyof T], EncodingOptions>>;
export type PluginEventHandler<T = unknown> = (payload: T) => void;
export type PluginEventHandlers<
  Events extends PluginEventDef[keyof PluginEventDef] = PluginEventDef[keyof PluginEventDef]
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
  Events extends PluginEventDef = any,
  PeerEvents extends PluginEventDef = any,
  Client extends CinderlinkClientInterface<
    Events & PeerEvents
  > = CinderlinkClientInterface<any>
> {
  id: string;
  client: Client;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  pubsub: SubscribeEventHandlers<Events>;
  p2p: ReceiveEventHandlers<Events>;
  coreEvents?: Partial<PluginEventHandlers<CinderlinkClientEvents["emit"]>>;
  pluginEvents?: PluginEventHandlers<PeerEvents["emit"]>;
}
export default PluginInterface;

export type PluginConstructor<
  Client extends CinderlinkClientInterface = CinderlinkClientInterface,
  Options extends Record<string, unknown> = {}
> = new (client: Client, options?: Options) => PluginInterface;
