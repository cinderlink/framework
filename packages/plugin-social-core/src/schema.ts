import { Schema } from "@cinderlink/ipld-database";
import {
  CinderlinkClientInterface,
  TableDefinition,
} from "@cinderlink/core-types";
import {
  SocialConnection,
  SocialChatMessage,
  SocialPost,
  SocialProfile,
  SocialUser,
  SocialUserPin,
  SocialComment,
  SocialReaction,
} from "./types";

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
        did: { type: "string" },
        address: { type: "string" },
        addressVerification: { type: "string" },
        name: { type: "string" },
        bio: { type: "string" },
        avatar: { type: "string" },
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
      userTextId: {
        unique: true,
        fields: ["did", "textId"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["did", "textId"],
    },
    schema: {
      type: "object",
      properties: {
        did: { type: "string" },
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
      userUid: {
        unique: true,
        fields: ["userUid"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["userUid"],
    },
    schema: {
      type: "object",
      properties: {
        userUid: { type: "string" },
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
        seenAt: { type: "number" },
        createdAt: { type: "number" },
      },
    },
  } as TableDefinition<SocialConnection>,
  posts: {
    schemaId: "social",
    encrypted: true,
    aggregate: {},
    indexes: {
      did: {
        unique: false,
        fields: ["did"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["did", "content", "attachments", "tags", "comments"],
    },
    schema: {
      type: "object",
      properties: {
        did: { type: "string" },
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
        seenAt: { type: "number" },
        createdAt: { type: "number" },
      },
    },
  } as TableDefinition<SocialPost>,
  comments: {
    schemaId: "social",
    encrypted: true,
    aggregate: {},
    indexes: {
      did: {
        unique: false,
        fields: ["did"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["did", "content", "postUid"],
    },
    schema: {
      type: "object",
      properties: {
        did: { type: "string" },
        content: { type: "string" },
        postUid: { type: "string" },
        reactions: {
          type: "array",
          items: {
            type: "string",
          },
        },
        seenAt: { type: "number" },
        createdAt: { type: "number" },
      },
    },
  } as TableDefinition<SocialComment>,
  reactions: {
    schemaId: "social",
    encrypted: true,
    aggregate: {},
    indexes: {
      postUid: {
        unique: true,
        fields: ["postUid", "from"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["postUid", "from"],
    },
    schema: {
      type: "object",
      properties: {
        emoji: {
          type: "string",
        },
        from: { type: "string" },
        postUid: { type: "string" },
        commentUid: { type: "string" },
        createdAt: { type: "number" },
        updatedAt: { type: "number" },
      },
    },
  } as TableDefinition<SocialReaction>,
  chat_messages: {
    schemaId: "social",
    encrypted: true,
    aggregate: {
      createdAt: "range",
    },
    indexes: {
      conversation: {
        unique: false,
        fields: ["from", "to"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["from", "to", "content", "tags", "comments"],
    },
    schema: {
      type: "object",
      properties: {
        from: { type: "string" },
        to: { type: "string" },
        message: { type: "string" },
        attachments: {
          type: "array",
          items: {
            type: "string",
          },
        },
        seenAt: { type: "number" },
        updatedAt: { type: "number" },
        createdAt: { type: "number" },
      },
    },
  } as TableDefinition<SocialChatMessage>,
};

export default SocialSchemaDef;

export async function loadSocialSchema(client: CinderlinkClientInterface<any>) {
  console.info(`plugin/social > preparing schema`);
  if (!client.schemas["social"]) {
    const schema = new Schema("social", SocialSchemaDef as any, client.dag);
    await client.addSchema("social", schema as any);
  } else {
    client.schemas["social"].setDefs(SocialSchemaDef as any);
  }
}
