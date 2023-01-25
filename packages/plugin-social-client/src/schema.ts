export const SocialSchemaDef = {
  users: {
    encrypted: false,
    aggregate: {},
    indexes: ["name", "did"],
    rollup: 1000,
    searchOptions: {
      fields: ["name", "did"],
    },
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        bio: { type: "string" },
        avatar: { type: "string" },
        did: { type: "string" },
      },
    },
  },
  profiles: {
    encrypted: false,
    aggregate: {},
    indexes: ["userId"],
    rollup: 1000,
    searchOptions: {
      fields: ["userId"],
    },
    schema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        banner: { type: "string" },
        albums: {
          type: "array",
          items: {
            type: "string",
          },
        },
        favoritePosts: {
          type: "array",
          items: {
            type: "string",
          },
        },
        favoriteConnections: {
          type: "array",
          items: {
            type: "string",
          },
        },
        updatedAt: { type: "number" },
      },
    },
  },
  connections: {
    encrypted: true,
    aggregate: {},
    indexes: ["from", "to"],
    rollup: 1000,
    searchOptions: {
      fields: ["from", "to"],
    },
    schema: {
      type: "object",
      properties: {
        from: { type: "string" },
        to: { type: "string" },
        follow: { type: "boolean" },
      },
    },
  },
  posts: {
    encrypted: true,
    aggregate: {},
    indexes: ["did", "cid"],
    rollup: 1000,
    searchOptions: {
      fields: ["did", "cid", "title", "content", "tags", "comments"],
    },
    schema: {
      type: "object",
      properties: {
        cid: { type: "string" },
        author: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        coverMedia: {
          type: "object",
          properties: {
            type: { type: "string" },
            url: { type: "string" },
          },
        },
        tags: { type: "array", items: { type: "string" } },
        reactions: {
          type: "array",
          items: {
            type: "string",
          },
        },
        comments: {
          type: "array",
          items: {
            type: "string",
          },
        },
        createdAt: { type: "number" },
      },
    },
  },
};
