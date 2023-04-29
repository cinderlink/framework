"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  OfflineSyncClientPlugin: () => OfflineSyncClientPlugin,
  default: () => plugin_default
});
module.exports = __toCommonJS(src_exports);

// src/plugin.ts
var import_emittery = __toESM(require("emittery"), 1);
var import_uuid = require("uuid");
var import_plugin_offline_sync_core = require("@cinderlink/plugin-offline-sync-core");
var import_date_fns = require("date-fns");
var OfflineSyncClientPlugin = class extends import_emittery.default {
  constructor(client, options = {}, logger) {
    super();
    this.client = client;
    this.options = options;
    this.logger = logger;
  }
  id = "offlineSyncClient";
  updatedAt = Date.now();
  interval = null;
  ready = false;
  p2p = {
    "/offline/send/response": this.onSendResponse,
    "/offline/get/request": this.onGetRequest,
    "/offline/get/response": this.onGetResponse,
    "/offline/get/confirmation": this.onGetConfirmation
  };
  pubsub = {};
  pluginEvents = {
    "/cinderlink/handshake/success": this.onPeerConnect
  };
  async start() {
    this.logger.info(`start: starting offline sync client plugin`);
    await (0, import_plugin_offline_sync_core.loadOfflineSyncSchema)(this.client);
    this.logger.info(`start: loaded offline-sync-client schema`);
    this.ready = true;
    this.logger.info(`start: plugin is ready`);
    this.emit("ready", {});
  }
  async stop() {
    this.logger.info(`stop: stopping plugin`);
  }
  async sendMessage(recipient, outgoing) {
    const requestId = (0, import_uuid.v4)();
    const servers = this.client.peers.getServers();
    let saved = false;
    for (const server of servers) {
      this.logger.info(`sendMessage: sending offline message to server`, {
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
      if (received?.payload.saved) {
        saved = true;
      }
    }
    return saved;
  }
  async onPeerConnect(peer) {
    this.logger.info(`onPeerConnect: asking new peer for offline messages`, {
      peerId: peer.peerId.toString()
    });
    await this.client.send(peer.peerId.toString(), {
      topic: "/offline/get/request",
      payload: {
        requestId: (0, import_uuid.v4)(),
        limit: 100
      }
    });
    this.logger.info(`onPeerConnect: /offline/get/request sent`, {
      to: peer.peerId.toString()
    });
  }
  async onSendResponse(message) {
    const { requestId, saved, error } = message.payload;
    if (!saved) {
      this.logger.error(`onSendResponse: server failed to save message`, {
        requestId
      });
      if (error)
        this.logger.error(`onSendResponse: error`, {
          error
        });
      return;
    }
    this.emit(`/send/response/${requestId}`, message.payload);
  }
  async onGetRequest(message) {
    const { requestId, limit } = message.payload;
    this.logger.info(`onGetRequest: handling request`, {
      from: message.peer.did,
      requestId
    });
    const table = this.client.getSchema("offlineSync")?.getTable("messages");
    if (!table) {
      this.logger.error(`onGetRequest: no offline-sync table found`);
      return;
    }
    if (!message.peer.did) {
      this.logger.error(`onGetRequest: no did found for peer`, {
        peerId: message.peer.peerId
      });
      return;
    }
    const messages = await table.query().where("recipient", "=", message.peer.did).limit(limit).select().execute().then((res) => res.all());
    this.logger.info(
      `onGetRequest: sending ${messages.length} messages to ${message.peer.did}`,
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
    const { requestId, messages } = response.payload;
    if (!messages.length) {
      this.logger.info(`onGetResponse: server has no offline messages`, {
        requestId
      });
      return;
    }
    this.logger.info(
      `onGetResponse: server has ${messages.length} offline messages`,
      { requestId }
    );
    let saved = [];
    let errors = {};
    for (const record of messages) {
      const { message, sender, createdAt = 0 } = record;
      this.logger.info(
        `onGetResponse: handling cinderlink message from ${sender}`,
        { record, date: (0, import_date_fns.formatRelative)(createdAt, /* @__PURE__ */ new Date()) }
      );
      let peer = this.client.peers.getPeer(sender);
      if (!peer) {
        peer = {
          peerId: response.peer.peerId,
          did: sender,
          authenticated: true,
          connected: true,
          metadata: {},
          role: "peer",
          subscriptions: []
        };
      }
      const connection = this.client.ipfs.libp2p.getConnections(peer.peerId)[0];
      await this.client.getPlugin("cinderlink")?.handleProtocolMessage(
        connection,
        message.payload
      ).then(() => {
        saved.push(record.id);
      }).catch((error) => {
        errors[record.id] = error.message;
      });
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
    const { requestId, saved, errors } = response.payload;
    if (saved.length) {
      this.logger.info(
        `onGetConfirmation: server saved ${saved.length} messages`,
        { requestId }
      );
    }
    if (errors && Object.keys(errors).length) {
      this.logger.error(
        `onGetConfirmation: server failed to save ${Object.keys(errors).length} messages`,
        { requestId }
      );
      this.logger.error(`onGetConfirmation: errors`, {
        errors
      });
    }
    const table = this.client.getSchema("offlineSync")?.getTable("messages");
    if (!table) {
      this.logger.error(`onGetConfirmation: no offline-sync table found`);
      return;
    }
    await table.query().where("id", "in", saved).delete().execute();
  }
};
var plugin_default = OfflineSyncClientPlugin;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OfflineSyncClientPlugin
});
//# sourceMappingURL=index.cjs.map