import { Schema } from "@candor/ipld-database";
import { CandorClientInterface, TableDefinition } from "@candor/core-types";

export const SocialSchemaDef: Record<string, TableDefinition> = {
  users: {
    schemaId: "social",
    encrypted: false,
    aggregate: {},
    indexes: {
      did: {
        unique: true,
        fields: ["did"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["id", "name", "did"],
    },
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        bio: { type: "string" },
        avatar: { type: "string" },
        did: { type: "string" },
        status: { type: "string" },
        updatedAt: { type: "number" },
      },
    },
  },
  user_pins: {
    schemaId: "social",
    encrypted: true,
    aggregate: {},
    indexes: {
      userCid: {
        unique: true,
        fields: ["cid"],
      },
      userTextId: {
        unique: true,
        fields: ["userId", "textId"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["userId", "cid", "textId"],
    },
    schema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        cid: { type: "string" },
        textId: { type: "string" },
        createdAt: { type: "number" },
        updatedAt: { type: "number" },
      },
    },
  },
  user_sync: {
    schemaId: "social",
    encrypted: true,
    aggregate: {},
    indexes: {
      userCid: {
        unique: true,
        fields: ["userId", "cid"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["id", "userId", "cid"],
    },
    schema: {
      type: "object",
      properties: {
        userId: { type: "number" },
        cid: { type: "string" },
        createdAt: { type: "number" },
        syncedAt: { type: "number" },
      },
    },
  },
  profiles: {
    schemaId: "social",
    encrypted: false,
    aggregate: {},
    indexes: {
      userId: {
        unique: true,
        fields: ["userId"],
      },
    },
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
    schemaId: "social",
    encrypted: true,
    aggregate: {},
    indexes: {
      outgoing: {
        unique: true,
        fields: ["from", "to"],
      },
    },
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
    schemaId: "social",
    encrypted: true,
    aggregate: {},
    indexes: {
      cid: {
        unique: true,
        fields: ["cid"],
      },
      authorId: {
        unique: false,
        fields: ["authorId"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["authorId", "cid", "content", "tags", "comments"],
    },
    schema: {
      type: "object",
      properties: {
        cid: { type: "string" },
        authorId: { type: "number" },
        content: { type: "string" },
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
  chat_messages: {
    schemaId: "social",
    encrypted: true,
    aggregate: {
      createdAt: "range",
    },
    indexes: {
      cid: {
        unique: true,
        fields: ["cid"],
      },
      conversation: {
        unique: false,
        fields: ["from", "to"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["authorId", "cid", "content", "tags", "comments"],
    },
    schema: {
      type: "object",
      properties: {
        remoteId: { type: "string" },
        cid: { type: "string" },
        from: { type: "string" },
        to: { type: "string" },
        message: { type: "string" },
        attachments: {
          type: "array",
          items: {
            type: "string",
          },
        },
        createdAt: { type: "number" },
        receivedAt: { type: "number" },
      },
    },
  },
};

export default SocialSchemaDef;

export async function loadSocialSchema(client: CandorClientInterface<any>) {
  console.info(`plugin/social > preparing schema`);
  if (!client.schemas["social"]) {
    const schema = new Schema("social", SocialSchemaDef, client.dag);
    await client.addSchema("social", schema);
  } else {
    client.schemas["social"].setDefs(SocialSchemaDef);
  }
}
