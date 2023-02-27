import { TableRow } from "@candor/core-types";

export type SocialUserStatus = "online" | "offline" | "away";

export interface SocialConnectionRecord extends TableRow {
  from: string;
  to: string;
  follow: boolean;
}

export interface SocialUser extends TableRow {
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

export type SocialClientPluginEvents = {
  ready: void;
  "/response/${string}":
    | SocialUserSearchResponseMessage
    | SocialUserGetResponseMessage;
  "/chat/message/sent": SocialChatMessageRequest;
  "/chat/message/received": SocialChatMessageRecord;
  "/chat/message/response": SocialChatMessageRecord;
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
  bio: string;
  avatar: string;
  status: "online" | "offline" | "away";
  updatedAt: number;
};

export type SocialChatMessageOutgoing = {
  to: string;
  message: string;
  attachments?: string[];
};

export type SocialChatMessageRequest = SocialChatMessageOutgoing & {
  requestId: string;
  cid: string;
  from: string;
};

export type SocialChatMessageResponse = {
  requestId: string;
  accepted: boolean;
  cid: string;
};

export interface SocialChatMessageRecord
  extends SocialChatMessageRequest,
    TableRow {
  createdAt: number;
  acceptedAt: number;
  rejectedAt?: number;
}

export type SocialUpdateMessage = {
  requestId: string;
  post: SocialPost;
};

export type SocialUpdateRecord = SocialUpdateMessage & {
  id: number;
  createdAt: number;
};

export type SocialUpdatesRequestMessage = {
  requestId: string;
  did?: string;
  since?: number;
};

export type SocialUpdatesResponseMessage = {
  requestId: string;
  updates: SocialPost[];
};

export type SocialUserSearchRequestMessage = {
  requestId: string;
  query: string;
};

export type SocialUserSearchResponseMessage = {
  requestId: string;
  results: SocialUser[];
};

export type SocialUserGetRequestMessage = {
  requestId: string;
  did: string;
};

export type SocialUserGetResponseMessage = {
  requestId: string;
  user: SocialUser;
};

export type SocialConnectionFilter = "in" | "out" | "mutual" | "all";
