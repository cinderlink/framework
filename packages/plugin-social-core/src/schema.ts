import { SocialChatMessageRecord } from "./types";
import { Schema } from "@candor/ipld-database";
import { CandorClientInterface, TableDefinition } from "@candor/core-types";
import {
  SocialConnectionRecord,
  SocialPost,
  SocialProfile,
  SocialUser,
  SocialUserPin,
} from "types";

export const SocialSchemaDef = {
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
  } as TableDefinition<SocialUser>,
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
  } as TableDefinition<SocialUserPin>,
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
  } as TableDefinition<SocialProfile>,
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
  } as TableDefinition<SocialConnectionRecord>,
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
      fields: ["cid", "authorId", "content", "attachments", "tags", "comments"],
    },
    schema: {
      type: "object",
      properties: {
        cid: {
          type: "string",
        },
        authorId: { type: "number" },
        content: { type: "string" },
        attachments: { type: "array", items: { type: "string" } },
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
        tags: { type: "array", items: { type: "string" } },
        createdAt: { type: "number" },
      },
    },
  } as TableDefinition<SocialPost>,
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
        requestId: { type: "string" },
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
  } as TableDefinition<SocialChatMessageRecord>,
};

export default SocialSchemaDef;

export async function loadSocialSchema(client: CandorClientInterface<any>) {
  console.info(`plugin/social > preparing schema`);
  if (!client.schemas["social"]) {
    const schema = new Schema("social", SocialSchemaDef as any, client.dag);
    await client.addSchema("social", schema as any);
  } else {
    client.schemas["social"].setDefs(SocialSchemaDef as any);
  }
}
