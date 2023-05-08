'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var Emittery = require('emittery');
var uuid = require('uuid');
var ipldDatabase = require('@cinderlink/ipld-database');
var dateFns = require('date-fns');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var Emittery__default = /*#__PURE__*/_interopDefault(Emittery);

// src/plugin.ts
var OfflineSyncSchemaDef = {
  messages: {
    schemaId: "offlineSync",
    encrypted: false,
    aggregate: {},
    indexes: {
      remoteId: {
        unique: false,
        fields: ["sender", "recipient"]
      }
    },
    rollup: 1e3,
    searchOptions: {
      fields: [
        "id",
        "sender",
        "recipients",
        "updatedAt",
        "deliveredAt",
        "attemptedAt"
      ]
    },
    schema: {
      type: "object",
      properties: {
        sender: { type: "string" },
        recipient: { type: "string" },
        message: { type: "object", additionalProperties: true, properties: {} },
        updatedAt: { type: "number" },
        deliveredAt: { type: "number" },
        attemptedAt: { type: "number" },
        attempts: { type: "number" }
      }
    }
  }
};
async function loadOfflineSyncSchema(client) {
  var _a;
  (_a = client.logger) == null ? void 0 : _a.info("offline-sync", "loading offline sync schema");
  if (!client.schemas["offlineSync"]) {
    const schema = new ipldDatabase.Schema(
      "offlineSync",
      OfflineSyncSchemaDef,
      client.dag,
      client.logger.module("db").submodule(`schema:offlineSync`)
    );
    await client.addSchema("offlineSync", schema);
  } else {
    client.schemas["offlineSync"].setDefs(OfflineSyncSchemaDef);
  }
}
var OfflineSyncClientPlugin = class extends Emittery__default.default {
  constructor(client, options = {}) {
    super();
    this.client = client;
    this.options = options;
    this.logger = client.logger.module("plugins").submodule("offlineSyncClient");
  }
  id = "offlineSyncClient";
  updatedAt = Date.now();
  interval = null;
  started = false;
  p2p = {
    "/offline/send/response": this.onSendResponse,
    "/offline/get/request": this.onGetRequest,
    "/offline/get/response": this.onGetResponse,
    "/offline/get/confirmation": this.onGetConfirmation
  };
  pubsub = {};
  logger;
  async start() {
    this.logger.info(`starting offline sync client plugin`);
    await loadOfflineSyncSchema(this.client);
    this.logger.info(`loaded offline-sync-client schema`);
    this.client.on("/peer/authenticated", this.onPeerConnect.bind(this));
    this.started = true;
    this.logger.info(`plugin is ready`);
    this.emit("ready", {});
  }
  async stop() {
    this.logger.info(`stopping plugin`);
    this.client.off("/peer/authenticated", this.onPeerConnect.bind(this));
  }
  async sendMessage(recipient, outgoing) {
    const requestId = uuid.v4();
    const servers = this.client.peers.getServers();
    let saved = false;
    for (const server of servers) {
      this.logger.info(`sending offline message to server`, {
        server: server.did,
        recipient,
        requestId
      });
      const received = await this.client.request(server.peerId.toString(), {
        topic: "/offline/send/request",
        payload: {
          requestId,
          recipient,
          message: outgoing
        }
      });
      if (received == null ? void 0 : received.payload.saved) {
        saved = true;
      }
    }
    return saved;
  }
  async onPeerConnect(peer) {
    this.logger.info(`peer connected, asking for offline messages...`, {
      peerId: peer.peerId.toString()
    });
    await this.client.send(peer.peerId.toString(), {
      topic: "/offline/get/request",
      payload: {
        requestId: uuid.v4(),
        limit: 100
      }
    });
  }
  async onSendResponse(message) {
    const { requestId, saved, error } = message.payload;
    if (!saved) {
      this.logger.error(`server failed to save message`, {
        requestId
      });
      if (error)
        this.logger.error(`server error`, {
          error
        });
      return;
    }
    this.emit(`/send/response/${requestId}`, message.payload);
  }
  async onGetRequest(message) {
    var _a;
    const { requestId, limit } = message.payload;
    this.logger.info(`handling get request`, {
      from: message.peer.did,
      requestId
    });
    const table = (_a = this.client.getSchema("offlineSync")) == null ? void 0 : _a.getTable("messages");
    if (!table) {
      this.logger.error(`no offline-sync table found`);
      return;
    }
    if (!message.peer.did) {
      this.logger.error(`no did found for peer`, {
        peerId: message.peer.peerId
      });
      return;
    }
    const messages = await table.query().where("recipient", "=", message.peer.did).limit(limit).select().execute().then((res) => res.all());
    this.logger.info(
      `sending ${messages.length} messages to ${message.peer.did}`,
      { requestId }
    );
    await this.client.send(
      message.peer.peerId.toString(),
      {
        topic: "/offline/get/response",
        payload: {
          requestId,
          messages
        }
      }
    );
  }
  async onGetResponse(response) {
    var _a;
    const { requestId, messages } = response.payload;
    if (!messages.length) {
      this.logger.info(`server has no offline messages`, {
        requestId
      });
      return;
    }
    this.logger.info(`server has ${messages.length} offline messages`, {
      requestId
    });
    let saved = [];
    let errors = {};
    for (const record of messages) {
      const { message, sender, createdAt = 0 } = record;
      this.logger.info(`handling protocol message from ${sender}`, {
        record,
        date: dateFns.formatRelative(createdAt, /* @__PURE__ */ new Date())
      });
      let peer = this.client.peers.getPeer(sender);
      if (!peer) {
        peer = {
          peerId: response.peer.peerId,
          did: sender,
          connected: true,
          metadata: {},
          role: "peer",
          subscriptions: []
        };
      }
      const connection = this.client.ipfs.libp2p.getConnections(peer.peerId)[0];
      await ((_a = this.client.getPlugin("cinderlink")) == null ? void 0 : _a.handleProtocolMessage(
        connection,
        message.payload
      ).then(() => {
        saved.push(record.id);
      }).catch((error) => {
        errors[record.id] = error.message;
      }));
    }
    await this.client.send(response.peer.peerId.toString(), {
      topic: "/offline/get/confirmation",
      payload: {
        requestId,
        saved,
        errors
      }
    });
  }
  async onGetConfirmation(response) {
    var _a;
    const { requestId, saved, errors } = response.payload;
    if (saved.length) {
      this.logger.info(`server saved ${saved.length} messages`, { requestId });
    }
    if (errors && Object.keys(errors).length) {
      this.logger.error(
        `server failed to save ${Object.keys(errors).length} messages`,
        { requestId }
      );
      this.logger.error(`errors`, {
        errors
      });
    }
    const table = (_a = this.client.getSchema("offlineSync")) == null ? void 0 : _a.getTable("messages");
    if (!table) {
      this.logger.error(`no offline-sync table found`);
      return;
    }
    await table.query().where("id", "in", saved).delete().execute();
  }
};
var plugin_default = OfflineSyncClientPlugin;

exports.OfflineSyncClientPlugin = OfflineSyncClientPlugin;
exports.default = plugin_default;
//# sourceMappingURL=out.js.map
//# sourceMappingURL=index.cjs.map