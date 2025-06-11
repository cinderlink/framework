import { z } from '@cinderlink/schema-registry';

// Social User Schema
export const SocialUserSchema = z.object({
  did: z.string(),
  address: z.string(),
  addressVerification: z.string(),
  name: z.string(),
  bio: z.string(),
  avatar: z.string(),
  status: z.string(),
  updatedAt: z.number(),
});

// Social User Pin Schema (encrypted)
export const SocialUserPinSchema = z.object({
  did: z.string(),
  textId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Social Profile Schema
export const SocialProfileSchema = z.object({
  userUid: z.string(),
  banner: z.string(),
  albums: z.array(z.string()),
  favoritePosts: z.array(z.string()),
  favoriteConnections: z.array(z.string()),
  updatedAt: z.number(),
});

// Social Connection Schema (encrypted)
export const SocialConnectionSchema = z.object({
  from: z.string(),
  to: z.string(),
  follow: z.boolean(),
  seenAt: z.number(),
  createdAt: z.number(),
});

// Social Post Schema (encrypted)
export const SocialPostSchema = z.object({
  cid: z.string(),
  did: z.string(),
  content: z.string(),
  attachments: z.array(z.string()),
  reactions: z.array(z.string()),
  comments: z.array(z.string()),
  tags: z.array(z.string()),
  seenAt: z.number(),
  createdAt: z.number(),
});

// Social Comment Schema (encrypted)
export const SocialCommentSchema = z.object({
  did: z.string(),
  content: z.string(),
  postUid: z.string(),
  reactions: z.array(z.string()),
  seenAt: z.number(),
  createdAt: z.number(),
});

// Social Reaction Schema (encrypted)
export const SocialReactionSchema = z.object({
  emoji: z.string(),
  from: z.string(),
  type: z.string(),
  postUid: z.string(),
  commentUid: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Social Chat Message Schema (encrypted)
export const SocialChatMessageSchema = z.object({
  from: z.string(),
  to: z.string(),
  message: z.string(),
  attachments: z.array(z.string()),
  seenAt: z.number(),
  updatedAt: z.number(),
  createdAt: z.number(),
});

// Social Notification Schema
export const SocialNotificationSchema = z.object({
  type: z.string(),
  sourceUid: z.string(),
  title: z.string(),
  body: z.string(),
  dismissed: z.boolean(),
  createdAt: z.number(),
  read: z.boolean(),
  link: z.string(),
  metaData: z.object({}).passthrough(), // Allow any properties
});

// Social Setting Schema (encrypted)
export const SocialSettingSchema = z.object({
  section: z.string(),
  key: z.string(),
  value: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Schema registry entries
export const socialSchemas = {
  users: { schema: SocialUserSchema, version: 1 },
  user_pins: { schema: SocialUserPinSchema, version: 1 },
  profiles: { schema: SocialProfileSchema, version: 1 },
  connections: { schema: SocialConnectionSchema, version: 1 },
  posts: { schema: SocialPostSchema, version: 1 },
  comments: { schema: SocialCommentSchema, version: 1 },
  reactions: { schema: SocialReactionSchema, version: 1 },
  chat_messages: { schema: SocialChatMessageSchema, version: 1 },
  notifications: { schema: SocialNotificationSchema, version: 1 },
  settings: { schema: SocialSettingSchema, version: 1 },
} as const;