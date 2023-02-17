import { CandorClientInterface, TableDefinition } from "@candor/core-types";
import { Schema } from "@candor/ipld-database";

export const NotificationSchemaDef: Record<string, TableDefinition> = {
  notifications: {
    schemaId: "notification",
    encrypted: false,
    aggregate: {},
    indexes: {
      id: {
        unique: true,
        fields: ["id"],
      },
    },
    rollup: 1000,
    searchOptions: {
      fields: ["id", "type"],
    },
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
        dismissed: { type: "boolean" },
        createdAt: { type: "number" },
        read: { type: "boolean" },
        link: { type: "string" },
        metaData: { type: "object" },
      },
    },
  },
};

export async function loadNotificationSchema(
  client: CandorClientInterface<any>
) {
  console.log(`plugin/notification/client > preparing schema`);
  if (!client.schemas["notification"]) {
    const schema = new Schema(
      "notification",
      NotificationSchemaDef,
      client.dag
    );
    await client.addSchema("notification", schema);
  } else {
    client.schemas["notification"].setDefs(NotificationSchemaDef);
  }
}

export default NotificationSchemaDef;
