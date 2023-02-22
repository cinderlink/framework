// src/plugin.ts
import Emittery from "emittery";
import { v4 as uuid } from "uuid";
import { formatRelative } from "date-fns";
var OfflineSyncClientPlugin = class extends Emittery {
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
    const requestId = uuid();
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
        requestId: uuid(),
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
        `plugin/offlineSync/client > handling candor message from ${sender} (${formatRelative(
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
export {
  OfflineSyncClientPlugin,
  plugin_default as default
};
