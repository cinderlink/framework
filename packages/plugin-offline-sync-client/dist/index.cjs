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
var import_date_fns = require("date-fns");
var OfflineSyncClientPlugin = class extends import_emittery.default {
  constructor(client, options = {}) {
    super();
    this.client = client;
    this.options = options;
  }
  id = "offlineSyncClient";
  updatedAt = Date.now();
  interval = null;
  ready = false;
  p2p = {
    "/offline/send/response": this.onSendResponse,
    "/offline/get/response": this.onGetResponse
  };
  pubsub = {};
  coreEvents = {
    "/peer/handshake": this.onPeerConnect
  };
  async start() {
    this.ready = true;
    console.info(`plugin/offlineSync/client > ready`);
    this.emit("ready", void 0);
  }
  async stop() {
    console.info(`plugin/offlineSync/client > stopping`);
  }
  async sendMessage(recipient, encoded) {
    const requestId = (0, import_uuid.v4)();
    const server = this.client.peers.getServers()[0];
    console.info(
      `plugin/offlineSync/client > sending offline message to server ${server.did} for ${recipient}: ${requestId}`
    );
    return this.client.request(server.peerId.toString(), {
      topic: "/offline/send/request",
      data: {
        requestId,
        recipient,
        message: encoded
      }
    });
  }
  async onPeerConnect(peer) {
    if (!this.client.peers.hasServer(peer.peerId.toString()))
      return;
    console.info(
      `plugin/offlineSync/client > asking new server for offline messages: ${peer.peerId}`
    );
    console.info(`plugin/offlineSync/client > sending get request`);
    await this.client.send(peer.peerId.toString(), {
      topic: "/offline/get/request",
      data: {
        requestId: (0, import_uuid.v4)(),
        limit: 100
      }
    });
  }
  async onSendResponse(message) {
    const { requestId, saved, error } = message.data;
    if (!saved) {
      console.error(
        `plugin/offlineSync/client > server failed to save message: ${requestId}`
      );
      if (error)
        console.error(error);
      return;
    }
    this.emit(`/send/response/${requestId}`, message.data);
  }
  async onGetResponse(response) {
    const { requestId, messages } = response.data;
    if (!messages.length) {
      console.info(
        `plugin/offlineSync/client > server has no offline messages: ${requestId}`
      );
      return;
    }
    console.info(
      `plugin/offlineSync/client > server has ${messages.length} offline messages: ${requestId}`
    );
    let saved = [];
    let errors = {};
    for (const record of messages) {
      console.info(
        `plugin/offlineSync/client > handling incoming message ${record.requestId}`,
        record
      );
      const { message, sender, createdAt = 0 } = record;
      console.info(
        `plugin/offlineSync/client > handling candor message from ${sender} (${(0, import_date_fns.formatRelative)(
          createdAt,
          /* @__PURE__ */ new Date()
        )})`
      );
      let peer = this.client.peers.getPeer(sender);
      if (!peer) {
        peer = {
          peerId: response.peer.peerId,
          did: sender,
          authenticated: true,
          connected: false,
          metadata: {},
          role: "peer",
          subscriptions: []
        };
      }
      await this.client.handleEncodedMessage(message, peer).then(() => {
        saved.push(record.id);
      }).catch((error) => {
        errors[record.id] = error.message;
      });
    }
    await this.client.send(response.peer.peerId.toString(), {
      topic: "/offline/get/confirmation",
      data: {
        requestId,
        saved,
        errors
      }
    });
  }
};
var plugin_default = OfflineSyncClientPlugin;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  OfflineSyncClientPlugin
});
