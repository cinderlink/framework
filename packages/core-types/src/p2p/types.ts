import { PluginEventPayloads } from "../plugin/types";
import { PubsubMessage } from "../pubsub";

export type Peer = {
  did: string;
  role: "server" | "peer";
  subscriptions: string[];
  metadata: Record<string, string>;
  connected: boolean;
  handshake: boolean;
};

export type PeerRole = "server" | "peer";

export type P2PCoreEvents = {
  "/peer/connect": Peer;
  "/peer/disconnect": Peer;
  "/server/connect": Peer;
  "/server/disconnect": Peer;
};

export type P2PMessageEvents<Events extends PluginEventPayloads> = {
  [key in keyof Events as key extends string
    ? `/peer/message/${key}` | `/server/message/${key}`
    : never]: PubsubMessage<Events[key]>;
};
