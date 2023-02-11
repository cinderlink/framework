import type { PluginEventDef } from "@candor/core-types";
import type {
  SocialUpdatesRequestMessage,
  SocialUpdatesResponseMessage,
  SocialConnectionMessage,
  SocialAnnounceMessage,
  SocialUpdateMessage,
  SocialUserSearchResponseMessage,
} from "@candor/plugin-social-core";
import { SocialUserSearchRequestMessage } from "@candor/plugin-social-core/src";

export interface SocialClientEvents extends PluginEventDef {
  send: {
    "/social/updates/request": SocialUpdatesRequestMessage;
    "/social/updates/response": SocialUpdatesResponseMessage;
    "/social/connection": SocialConnectionMessage;
    "/social/announce": SocialAnnounceMessage;
    "/social/users/search/request": SocialUserSearchRequestMessage;
    "/social/users/search/response": SocialUserSearchResponseMessage;
  };
  receive: {
    "/social/updates/request": SocialUpdatesRequestMessage;
    "/social/updates/response": SocialUpdatesResponseMessage;
    "/social/connection": SocialConnectionMessage;
    "/social/announce": SocialAnnounceMessage;
    "/social/users/search/response": SocialUserSearchResponseMessage;
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
