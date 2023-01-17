import { CandorClientEvents } from "../../dist";
import { CandorClientInterface } from "../client/interface";
import { PubsubMessage } from "../pubsub";

export type PluginEventPayloads = Record<string, unknown>;

export type PluginEventHandler<T = unknown> = (payload: T) => void;

export type PluginEventHandlers<
  Events extends PluginEventPayloads = PluginEventPayloads
> = {
  [key in keyof Events]: PluginEventHandler<Events[key]>;
};

export type PluginEventDef = {
  send: PluginEventPayloads;
  receive: PluginEventPayloads;
  publish: PluginEventPayloads;
  subscribe: PluginEventPayloads;
  emit: PluginEventPayloads;
};

export interface PluginInterface<
  Events extends PluginEventDef = {
    send: {};
    receive: {};
    publish: {};
    subscribe: {};
    emit: {};
  },
  ClientEvents extends PluginEventDef["emit"] &
    CandorClientEvents = PluginEventDef["emit"] & CandorClientEvents
> {
  id: string;
  client: CandorClientInterface<Events, ClientEvents>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  pubsub: {
    [key in keyof Events["publish"]]: PluginEventHandler<
      PubsubMessage<Events["publish"][key]>
    >;
  };
  p2p: {
    [key in keyof Events["receive"]]: PluginEventHandler<
      PubsubMessage<Events["receive"][key]>
    >;
  };
  events: {
    [key in keyof Events["emit"]]: PluginEventHandler<Events["emit"][key]>;
  };
}
export default PluginInterface;

export type PluginConstructor<
  PluginEvents extends PluginEventDef = PluginEventDef,
  Options extends Record<string, unknown> = {}
> = new (
  client: CandorClientInterface<PluginEvents>,
  options?: Options
) => PluginInterface;
