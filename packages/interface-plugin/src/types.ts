import type { CryptidsClient, PubsubMessage } from "@cryptids/client";

export type PluginEventPayloads = {
  [key: string]: unknown;
};

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
  Events extends PluginEventDef = PluginEventDef
> {
  id: string;
  client: CryptidsClient<[Events]>;
  start?(): Promise<void>;
  stop?(): Promise<void>;
  pubsub: Record<
    keyof Events["subscribe"],
    PluginEventHandler<
      PubsubMessage<
        keyof Events["subscribe"] extends string
          ? keyof Events["subscribe"]
          : never,
        Events["subscribe"][keyof Events["subscribe"]]
      >
    >
  >;
  p2p: Record<
    keyof Events["receive"],
    PluginEventHandler<Events["receive"][keyof Events["receive"]]>
  >;
  events: Record<keyof Events["emit"], Events["emit"][keyof Events["emit"]]>;
}
export default PluginInterface;
