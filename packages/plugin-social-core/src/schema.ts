import { Schema } from "@candor/ipld-database";
import { CandorClientInterface, TableDefinition } from "@candor/core-types";
import { SocialClientPluginEvents } from "./types";

export const SocialSchemaDef: Record<string, TableDefinition> = {
  users: {
    encrypted: false,
    aggregate: {},
    indexes: ["name", "did"],
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
    indexes: ["authorId", "cid"],
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
