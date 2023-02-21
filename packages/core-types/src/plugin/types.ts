import {
  EncodingOptions,
  ProtocolPayload,
  ProtocolRequest,
} from "./../protocol/types";
import { ReceiveEventHandlers } from "./../p2p/types";
import { SubscribeEventHandlers } from "../pubsub";
import { CandorClientEvents, CandorClientInterface } from "../client";

export type PluginEventPayloads = Record<
  string,
  ProtocolPayload<ProtocolRequest, EncodingOptions>
>;
export type PluginEventHandler<T = unknown> = (payload: T) => void;
export type PluginEventHandlers<
  Events extends PluginEventPayloads = PluginEventPayloads
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
  ReferencedEvents extends PluginEventDef = PluginEvents
> {
  id: string;
  client: CandorClientInterface<ReferencedEvents>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  pubsub: SubscribeEventHandlers<PluginEvents>;
  p2p: ReceiveEventHandlers<PluginEvents>;
  coreEvents?: Partial<PluginEventHandlers<CandorClientEvents["emit"]>>;
  pluginEvents?: Partial<PluginEventHandlers<PluginEvents["emit"]>>;
}
export default PluginInterface;

export type PluginConstructor<
  PluginEvents extends PluginEventDef = PluginEventDef,
  Options extends Record<string, unknown> = {}
> = new (
  client: CandorClientInterface<PluginEvents>,
  options?: Options
) => PluginInterface;
