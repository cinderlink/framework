import type { PluginEventDef } from "@candor/core-types";
import type {
  SocialUpdatesRequestMessage,
  SocialUpdatesResponseMessage,
  SocialConnectionMessage,
  SocialAnnounceMessage,
  SocialUpdateMessage,
  SocialUserSearchResponseMessage,
  SocialChatMessageRequest,
  SocialChatMessageResponse,
  SocialUserGetRequestMessage,
  SocialUserGetResponseMessage,
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
    "/social/user/get/request": SocialUserGetRequestMessage;
    "/social/user/get/response": SocialUserGetResponseMessage;
    "/social/chat/message/request": SocialChatMessageRequest;
    "/social/chat/message/response": SocialChatMessageResponse;
  };
  receive: {
    "/social/updates/request": SocialUpdatesRequestMessage;
    "/social/updates/response": SocialUpdatesResponseMessage;
    "/social/connection": SocialConnectionMessage;
    "/social/announce": SocialAnnounceMessage;
    "/social/users/search/response": SocialUserSearchResponseMessage;
    "/social/user/get/response": SocialUserGetResponseMessage;
    "/social/chat/message/request": SocialChatMessageRequest;
    "/social/chat/message/response": SocialChatMessageResponse;
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
  emit: {
    "/chat/message/sent": SocialChatMessageRequest;
    "/chat/message/received": SocialChatMessageRequest;
    "/chat/message/response": SocialChatMessageResponse;
  };
}
