import type { PluginEventDef } from "@candor/core-types";

export type SocialConnectionRecord = {
  id?: number;
  fromId: number;
  toId: number;
  follow: boolean;
};

export type SocialUser = {
  id?: number;
  name: string;
  bio: string;
  avatar: string;
  did: string;
};

export type SocialProfile = {
  id: number;
  userId: number;
  banner: string;
  albums: string[];
  favoritePosts: string[];
  favoriteConnections: string[];
  updatedAt: number;
};

export type SocialPost = {
  id: number;
  authorId: number;
  content: string;
  attachments: string[];
  comments: string[];
  reactions: string[];
  tags: string[];
  createdAt: number;
};

export type SocialReaction = {
  id: number;
  postId: number;
  reaction: "like" | "love" | "haha" | "wow" | "sad" | "angry";
  from: string;
  createdAt: number;
};

export type SocialComment = {
  postId: number;
  body: string;
  authorId: number;
  createdAt: number;
};

export type SocialClientPluginEvents = {
  ready: void;
};

export type SocialConnectionMessage = {
  from: string;
  to: string;
  requestId: string;
  follow: boolean;
};

export type SocialAnnounceMessage = {
  requestId: string;
  name: string;
  avatar: string;
};

export type SocialUpdateMessage = {
  requestId: string;
  cid: string;
};

export type SocialUpdatesRequestMessage = {
  requestId: string;
  since: number;
};

export type SocialUpdatesResponseMessage = {
  requestId: string;
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
