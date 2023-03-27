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
  did: string;
  uid: string;
  cid: string;
  textId: string;
  createdAt: number;
  updatedAt: number;
}

export interface SocialProfile extends TableRow {
  userUid: string;
  banner: string;
  albums: string[];
  favoritePosts: string[];
  favoriteConnections: string[];
  updatedAt: number;
}

export interface SocialPost extends TableRow {
  uid: string;
  cid: string;
  did: string;
  content: string;
  attachments?: string[];
  comments?: string[];
  reactions?: string[];
  tags?: string[];
  createdAt: number;
}

export interface SocialReaction extends TableRow {
  cid: string;
  from: string;
  emoji: string;
  createdAt: number;
  commentCid?: string;
  postUid: string;
  postCid?: string;
}

export interface SocialComment extends TableRow {
  postUid: string;
  content: string;
  cid: string;
  did: string;
  createdAt: number;
}

export interface SocialChatMessage extends TableRow {
  uid: string;
  cid: string;
  from: string;
  to: string;
  message: string;
  attachments?: string[];
  createdAt: number;
  seenAt: number;
  acceptedAt: number;
  rejectedAt?: number;
}

export interface SocialClientPluginEvents {
  ready: void;
}

export interface SocialUsersSearchRequest {
  requestId: string;
  query: string;
}

export interface SocialUsersSearchResponse {
  requestId: string;
  results: SocialUser[];
}

export interface SocialUsersPinRequest {
  requestId: string;
  did: string;
  cid: string;
  textId?: string;
}

export interface SocialUsersPinResponse {
  requestId: string;
  pin: SocialUserPin;
}

export interface SocialUsersGetRequest {
  requestId: string;
  did: string;
}

export interface SocialUsersGetResponse {
  requestId: string;
  user: SocialUser;
}

export type SocialConnectionFilter = "in" | "out" | "mutual" | "all";

export interface SocialClientEvents extends PluginEventDef {
  send: {
    "/social/users/announce": Partial<SocialUser>;
    "/social/users/search/request": SocialUsersSearchRequest;
    "/social/users/search/response": SocialUsersSearchResponse;
    "/social/users/pin/request": SocialUsersPinRequest;
    "/social/users/pin/response": SocialUsersPinResponse;
  };
  receive: {
    "/social/users/announce": Partial<SocialUser>;
    "/social/users/search/response": SocialUsersSearchResponse;
    "/social/users/pin/response": SocialUsersPinResponse;
  };
  publish: {
    "/social/users/announce": Partial<SocialUser>;
  };
  subscribe: {
    "/social/users/announce": Partial<SocialUser>;
  };
  emit: {};
}
