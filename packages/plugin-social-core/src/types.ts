import { PluginEventDef, TableRow } from "@cinderlink/core-types";

export type SocialUserStatus = "online" | "offline" | "away";
export type Base64 = `data:image/${string};base64${string}`;

export interface SocialConnection extends TableRow {
  from: string;
  to: string;
  follow: boolean;
}

export interface SocialUser extends TableRow {
  address?: `0x${string}`;
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
  from: string;
  type: "post" | "comment";
  emoji: string;
  postUid: string;
  commentUid: string;
  createdAt: number;
  updatedAt: number;
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
export type SocialNotificationType =
  | "connection/follow/received"
  | "chat/message/received"
  | "post/created"
  | "post/comment/created";

export type SocialNotification = TableRow & {
  type: SocialNotificationType;
  sourceUid: string;
  title: string;
  body: string;
  dismissed?: boolean;
  createdAt?: number;
  read?: boolean;
  link?: string;
  metaData?: Record<string, unknown>;
  browser?: NotificationOptions;
};

export interface SocialClientPluginEvents {
  ready: void;
  "/notification/clicked": {
    notification: SocialNotification;
    options: NotificationOptions;
  };
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
  pin?: SocialUserPin;
  error?: string;
}

export interface SocialUsersGetRequest {
  requestId: string;
  did: string;
}

export interface SocialUsersGetResponse {
  requestId: string;
  user: SocialUser;
}

export interface SocialSetting extends TableRow {
  section: string;
  key: string;
  value: unknown;
}

export type SocialConnectionFilter = "in" | "out" | "mutual" | "all";

export interface SocialClientEvents extends PluginEventDef {
  send: {
    "/social/users/announce": Partial<SocialUser>;
    "/social/users/search/request": SocialUsersSearchRequest;
    "/social/users/search/response": SocialUsersSearchResponse;
    "/social/users/pin/request": SocialUsersPinRequest;
    "/social/users/pin/response": SocialUsersPinResponse;
    "/social/users/get/request": SocialUsersGetRequest;
  };
  receive: {
    "/social/users/announce": Partial<SocialUser>;
    "/social/users/search/response": SocialUsersSearchResponse;
    "/social/users/pin/response": SocialUsersPinResponse;
    "/social/users/get/response": SocialUsersGetResponse;
  };
  publish: {
    "/social/users/announce": Partial<SocialUser>;
    "/social/posts/create": SocialPost;
    "/social/connections/create": SocialConnection;
  };
  subscribe: {
    "/social/users/announce": Partial<SocialUser>;
    "/social/posts/create": SocialPost;
    "/social/connections/create": SocialConnection;
  };
  emit: {};
}
