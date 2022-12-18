import CryptidsClient, { PubsubMessage } from "client";

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
  }
> {
  id: string;
  client: CryptidsClient<Events>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  pubsub: Record<
    keyof Events["subscribe"],
    PluginEventHandler<
      PubsubMessage<Events["subscribe"][keyof Events["subscribe"]]>
    >
  >;
  p2p: Record<
    keyof Events["receive"],
    PluginEventHandler<Events["receive"][keyof Events["receive"]]>
  >;
  events: Record<keyof Events["emit"], Events["emit"][keyof Events["emit"]]>;
}
export default PluginInterface;
