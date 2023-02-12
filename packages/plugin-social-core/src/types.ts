export type SocialConnectionRecord = {
  id: number;
  from: string;
  to: string;
  follow: boolean;
};

export type SocialConnection = SocialConnectionRecord & {
  direction: "in" | "out" | "mutual";
};

export type SocialUserStatus = "online" | "offline" | "away";

export type SocialUser = {
  id: number;
  name: string;
  bio: string;
  status: SocialUserStatus;
  avatar: string;
  did: string;
  updatedAt: number;
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
  remoteId: string;
  cid: string;
  from: string;
};

export type SocialChatMessageResponse = {
  remoteId: string;
  accepted: boolean;
  cid: string;
};

export type SocialChatMessageRecord = SocialChatMessageRequest & {
  id: number;
  createdAt: number;
  acceptedAt: number;
  rejectedAt?: number;
};

export type SocialUpdateMessage = {
  requestId: string;
  post: SocialPost;
};

export type SocialUpdatesRequestMessage = {
  requestId: string;
  since: number;
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
