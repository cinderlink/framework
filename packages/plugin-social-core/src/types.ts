import { PluginEventDef, TableRow } from "@cinderlink/core-types";

export type SocialUserStatus = "online" | "offline" | "away";

export interface SocialConnection extends TableRow {
  from: string;
  to: string;
  follow: boolean;
}

export interface SocialUser extends TableRow {
  address?: string;
  addressVerification?: string;
  name: string;
  bio: string;
  status: SocialUserStatus;
  avatar: string;
  did: string;
  updatedAt: number;
}

export interface SocialUserPin extends TableRow {
  userId: number;
  cid: string;
  textId: string;
  createdAt: number;
  updatedAt: number;
}

export interface SocialProfile extends TableRow {
  userId: number;
  banner: string;
  albums: string[];
  favoritePosts: string[];
  favoriteConnections: string[];
  updatedAt: number;
}

export interface SocialPost extends TableRow {
  cid?: string;
  did: string;
  content: string;
  attachments?: string[];
  comments?: string[];
  reactions?: string[];
  tags?: string[];
  createdAt: number;
}

export interface SocialReaction extends TableRow {
  postId: number;
  reaction: "like" | "love" | "haha" | "wow" | "sad" | "angry";
  from: string;
  createdAt: number;
}

export interface SocialComment extends TableRow {
  postId: number;
  body: string;
  did: string;
  createdAt: number;
}

export interface SocialChatMessage extends TableRow {
  cid?: string;
  from: string;
  to: string;
  message: string;
  attachments?: string[];
  createdAt: number;
  acceptedAt: number;
  rejectedAt?: number;
}

export interface SocialClientPluginEvents {
  ready: void;
  "/chat/message/sent": SocialChatMessage;
  "/chat/message/received": SocialChatMessage;
  "/chat/message/confirmed": SyncResponse;
}

export interface SocialPostsFetchRequest {
  requestId: string;
  did?: string;
  since?: number;
}

export interface SocialPostsFetchResponse {
  requestId: string;
  updates: SocialPost[];
}

export interface SocialUsersSearchRequest {
  requestId: string;
  query: string;
}

export interface SocialUsersSearchResponse {
  requestId: string;
  results: SocialUser[];
}

export interface SocialUsersGetRequest {
  requestId: string;
  did: string;
}

export interface SocialUsersGetResponse {
  requestId: string;
  user: SocialUser;
}

export interface SyncResponse {
  cid?: string;
  requestId?: string;
  success?: boolean;
  error?: string;
}

export type SocialConnectionFilter = "in" | "out" | "mutual" | "all";

export interface SocialClientEvents extends PluginEventDef {
  send: {
    "/social/connections/create": SocialConnection;
    "/social/users/announce": SocialUser;
    "/social/users/search/request": SocialUsersSearchRequest;
    "/social/users/search/response": SocialUsersSearchResponse;
    "/social/users/get/request": SocialUsersGetRequest;
    "/social/users/get/response": SocialUsersGetResponse;
    "/social/chat/message/send": SocialChatMessage;
    "/social/chat/message/confirm": SyncResponse;
    "/social/posts/create": SocialPost;
    "/social/posts/confirm": SyncResponse;
    "/social/posts/fetch/request": SocialPostsFetchRequest;
    "/social/posts/fetch/response": SocialPostsFetchResponse;
  };
  receive: {
    "/social/posts/create": SocialPost;
    "/social/posts/fetch/request": SocialPostsFetchRequest;
    "/social/posts/fetch/response": SocialPostsFetchResponse;
    "/social/connections/create": SocialConnection;
    "/social/connections/confirm": SocialConnection;
    "/social/users/announce": SocialUser;
    "/social/users/search/response": SocialUsersSearchResponse;
    "/social/users/get/response": SocialUsersGetResponse;
    "/social/chat/message/send": SocialChatMessage;
    "/social/chat/message/confirm": SyncResponse;
  };
  publish: {
    "/social/connections/create": SocialConnection;
    "/social/users/announce": SocialUser;
    "/social/posts/create": SocialPost;
  };
  subscribe: {
    "/social/connections/create": SocialConnection;
    "/social/users/announce": SocialUser;
    "/social/posts/create": SocialPost;
  };
  emit: {
    "/chat/message/sent": SocialChatMessage;
    "/chat/message/received": SocialChatMessage;
    "/chat/message/confirmed": SyncResponse;
  };
}
