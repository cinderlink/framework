import type { PluginEventDef } from "@candor/core-types";

export type SocialConnectionMessage = {
  requestID: string;
  to: string;
  follow: boolean;
};

export type SocialAnnounceMessage = {
  requestID: string;
  name: string;
  avatar: string;
};

export type SocialUpdateMessage = {
  requestID: string;
  cid: string;
};

export type SocialUpdatesRequestMessage = {
  requestID: string;
  since: number;
};

export type SocialUpdatesResponseMessage = {
  requestID: string;
  updates: SocialUpdateMessage[];
};

export interface SocialClientEvents extends PluginEventDef {
  send: {
    "/social/updates/request": SocialUpdatesRequestMessage;
    "/social/updates/response": SocialUpdatesResponseMessage;
  };
  receive: {
    "/social/updates/request": SocialUpdatesRequestMessage;
    "/social/updates/response": SocialUpdatesResponseMessage;
  };
  publish: {
    "/social/connection": SocialConnectionMessage;
    "/social/announce": SocialAnnounceMessage;
    "/social/update": SocialUpdateMessage;
  };
  subscribe: {
    "/social/connection": SocialConnectionMessage;
    "/social/announce": SocialAnnounceMessage;
    "/social/update": SocialUpdateMessage;
  };
  emit: {};
}
