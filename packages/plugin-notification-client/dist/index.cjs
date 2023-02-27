"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  NotificationClientPlugin: () => NotificationClientPlugin,
  NotificationSchemaDef: () => NotificationSchemaDef,
  default: () => plugin_default,
  loadNotificationSchema: () => loadNotificationSchema
});
module.exports = __toCommonJS(src_exports);

// src/schema.ts
var import_ipld_database = require("@candor/ipld-database");
var NotificationSchemaDef = {
  notifications: {
    schemaId: "notification",
    encrypted: false,
    aggregate: {},
    indexes: {
      id: {
        unique: true,
        fields: ["id"]
      }
    },
    rollup: 1e3,
    searchOptions: {
      fields: ["id", "type"]
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
        metaData: { type: "object" }
      }
    }
  }
};
async function loadNotificationSchema(client) {
  console.log(`plugin/notification/client > preparing schema`);
  if (!client.schemas["notification"]) {
    const schema = new import_ipld_database.Schema(
      "notification",
      NotificationSchemaDef,
      client.dag
    );
    await client.addSchema("notification", schema);
  } else {
    client.schemas["notification"].setDefs(NotificationSchemaDef);
  }
}

// src/plugin.ts
var NotificationClientPlugin = class {
  constructor(client, options = {}) {
    this.client = client;
    this.options = options;
  }
  id = "notificationClient";
  ready = false;
  loggerTag = "plugin/notification/client > ";
  p2p = {};
  pubsub = {};
  async start() {
    console.info(this.loggerTag, "started");
    await loadNotificationSchema(this.client);
    console.info(this.loggerTag, "ready");
    this.ready = true;
  }
  get db() {
    const schema = this.client.getSchema("notification");
    if (!schema) {
      throw new Error(`plugin/social/client > failed to get schema`);
    }
    return schema;
  }
  table(name) {
    const table = this.db.getTable(name);
    if (!table) {
      throw new Error(`${this.loggerTag}failed to get table ${name}`);
    }
    return table;
  }
  async stop() {
    console.info(this.loggerTag, "stopped");
  }
};
var plugin_default = NotificationClientPlugin;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  NotificationClientPlugin,
  NotificationSchemaDef,
  loadNotificationSchema
});
//# sourceMappingURL=index.cjs.map