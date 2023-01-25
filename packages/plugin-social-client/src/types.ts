import type { PluginEventDef } from "@candor/core-types";

export type SocialConnectionRecord = {
  id?: number;
  from: string;
  to: string;
  follow: boolean;
};

export type SocialUser = {
  id?: number;
  name: string;
  bio: string;
  avatar: string;
  did: string;
};

export type SocialPost = {
  cid: string;
  author: string;
  content: string;
  attachments: string[];
  comments: string[];
  reactions: string[];
  tags: string[];
  createdAt: number;
};

export type SocialReaction = {
  postCid: string;
  reaction: "like" | "love" | "haha" | "wow" | "sad" | "angry";
  from: string;
  createdAt: number;
};

export type SocialComment = {
  postId: string;
  body: string;
  from: string;
  createdAt: number;
};

export type SocialClientPluginEvents = {
  ready: void;
};

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
