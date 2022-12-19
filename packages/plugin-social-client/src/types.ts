import type { PluginEventDef } from "@cryptids/client";

export type SocialConnectionMessage = {
  to: string;
  follow: boolean;
};

export type SocialAnnounceMessage = {
  name: string;
  avatar: string;
};

export type SocialUpdateMessage = {
  cid: string;
};

export type SocialUpdatesRequestMessage = {
  since: number;
};

export type SocialUpdatesResponseMessage = {
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
  };
  subscribe: {
    "/social/connection": SocialConnectionMessage;
    "/social/announce": SocialAnnounceMessage;
  };
  emit: {};
}
