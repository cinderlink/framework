export type SocialConnectionRecord = {
  id?: number;
  fromId: number;
  toId: number;
  follow: boolean;
};

export type SocialUserStatus = "online" | "offline" | "away";

export type SocialUser = {
  id?: number;
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

export type SocialUserSearchRequestMessage = {
  requestId: string;
  query: string;
};

export type SocialUserSearchResponseMessage = {
  requestId: string;
  results: SocialUser[];
};
