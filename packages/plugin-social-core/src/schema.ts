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
  SocialNotification,
  SocialSetting,
} from "./types";
import { socialSchemas } from "./zod-schemas";

export const SocialSchemaDef = {
  users: {
    schemaId: "social.users",
    schemaVersion: 1,
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
  } as TableDefinition<SocialUser>,
  user_pins: {
    schemaId: "social.user_pins",
    schemaVersion: 1,
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
  } as TableDefinition<SocialUserPin>,
  profiles: {
    schemaId: "social.profiles",
    schemaVersion: 1,
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
  } as TableDefinition<SocialProfile>,
  connections: {
    schemaId: "social.connections",
    schemaVersion: 1,
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
  } as TableDefinition<SocialConnection>,
  posts: {
    schemaId: "social.posts",
    schemaVersion: 1,
    encrypted: true,
    aggregate: {},
    indexes: {
      cid: {
        unique: true,
        fields: ["cid"],
      },
      did: {
        unique: false,
        fields: ["did"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["did", "content", "attachments", "tags", "comments"],
    },
  } as TableDefinition<SocialPost>,
  comments: {
    schemaId: "social.comments",
    schemaVersion: 1,
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
  } as TableDefinition<SocialComment>,
  reactions: {
    schemaId: "social.reactions",
    schemaVersion: 1,
    encrypted: true,
    aggregate: {},
    indexes: {
      postUid: {
        unique: true,
        fields: ["postUid", "from", "commentUid"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["postUid", "from"],
    },
  } as TableDefinition<SocialReaction>,
  chat_messages: {
    schemaId: "social.chat_messages",
    schemaVersion: 1,
    encrypted: true,
    aggregate: {
      createdAt: "range",
    },
    indexes: {
      conversation: {
        unique: false,
        fields: ["from", "to"],
      },
      message: {
        unique: true,
        fields: ["from", "to", "message", "createdAt"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["from", "to", "content", "tags", "comments"],
    },
  } as TableDefinition<SocialChatMessage>,
  notifications: {
    schemaId: "social.notifications",
    schemaVersion: 1,
    encrypted: false,
    aggregate: {},
    indexes: {
      type: {
        unique: true,
        fields: ["sourceUid", "type"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["sourceUid", "type"],
    },
  } as TableDefinition<SocialNotification>,
  settings: {
    schemaId: "social.settings",
    schemaVersion: 1,
    encrypted: true,
    aggregate: {},
    indexes: {
      type: {
        unique: true,
        fields: ["key"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["section", "key", "value"],
    },
  } as TableDefinition<SocialSetting>,
};

export default SocialSchemaDef;

export async function loadSocialSchema(client: CinderlinkClientInterface<any>) {
  client.logger.info(
    "plugins",
    "social-core/loadSocialSchema: preparing schema"
  );
  
  // Register Zod schemas with the schema registry
  if (client.schemaRegistry) {
    Object.entries(socialSchemas).forEach(([tableName, { schema, version }]) => {
      client.schemaRegistry!.registerSchema(`social.${tableName}`, version, {
        schema,
        migrate: async (data: unknown) => data, // No migration needed for v1
      });
    });
  }
  
  if (!client.schemas["social"]) {
    const schema = new Schema(
      "social",
      SocialSchemaDef as any,
      client.dag,
      client.logger.module("db").submodule(`schema:social`),
      client.schemaRegistry
    );
    await client.addSchema("social", schema as any);
  } else {
    client.schemas["social"].setDefs(SocialSchemaDef as any);
  }
}
