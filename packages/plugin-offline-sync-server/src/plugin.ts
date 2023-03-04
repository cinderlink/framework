import { CandorProtocolPlugin } from "@candor/protocol";
import type {
  PluginInterface,
  CandorClientInterface,
  IncomingP2PMessage,
  EncodingOptions,
} from "@candor/core-types";
import {
  loadOfflineSyncSchema,
  OfflineSyncGetConfirmation,
  OfflineSyncGetRequest,
  OfflineSyncGetResponse,
  OfflineSyncRecord,
  OfflineSyncSendRequest,
  OfflineSyncSendResponse,
} from "@candor/plugin-offline-sync-core";

export type OfflineSyncServerEvents = {
  publish: {};
  subscribe: {};
  send: {
    "/offline/get/response": OfflineSyncGetResponse;
    "/offline/send/response": OfflineSyncSendResponse;
  };
  receive: {
    "/offline/get/request": OfflineSyncGetRequest;
    "/offline/get/confirmation": OfflineSyncGetConfirmation;
    "/offline/send/request": OfflineSyncSendRequest;
  };
  emit: {};
};

export class OfflineSyncServerPlugin
  implements
    PluginInterface<
      OfflineSyncServerEvents,
      CandorClientInterface<OfflineSyncServerEvents>
    >
{
  id = "offlineSyncServer";
  constructor(
    public client: CandorClientInterface<OfflineSyncServerEvents>,
    public options: Record<string, unknown> = {}
  ) {}
  async start() {
    console.info(`plugin/offlineSyncServer > loading schema`);
    await loadOfflineSyncSchema(this.client);
  }
  async stop() {
    console.info("social server plugin stopped");
  }
  p2p = {
    "/offline/get/request": this.onGetRequest,
    "/offline/get/confirmation": this.onGetConfirmation,
    "/offline/send/request": this.onSendRequest,
  };
  pubsub = {};
  events = {};

  get db() {
    const schema = this.client.getSchema("offlineSync");
    if (!schema) {
      throw new Error(`plugin/offlineSync/erver > failed to get schema`);
    }
    return schema;
  }

  table() {
    const table = this.db.getTable<OfflineSyncRecord>("messages");
    if (!table) {
      throw new Error(`plugin/offlineSync/erver > failed to get table ${name}`);
    }
    return table;
  }

  async onSendRequest(
    message: IncomingP2PMessage<
      OfflineSyncServerEvents,
      "/offline/send/request",
      EncodingOptions
    >
  ) {
    if (!message.peer.peerId) {
      console.warn(
        `plugin/offlineSync/server > onSendRequest > peer does not have peerId`,
        message.peer
      );
      return;
    }

    if (!message.peer.did) {
      console.warn(
        `plugin/offlineSync/server > onSendRequest > peer does not have did`,
        message.peer
      );
      return;
    }

    // pin the CID for the user
    if (message.payload.message.cid) {
      await this.client.ipfs.pin.add(message.payload.message.cid, {
        recursive: true,
      });
    }

    console.info(`plugin/offlineSync/server > onSendRequest`, message.payload);
    // if the recipient is online, just send the message
    if (this.client.peers.isDIDConnected(message.payload.recipient)) {
      const peer = this.client.peers.getPeerByDID(message.payload.recipient);

      if (
        peer &&
        (this.client.getPlugin("candor") as CandorProtocolPlugin)
          ?.protocolHandlers[peer.peerId.toString()]
      ) {
        console.info(
          `plugin/offlineSync/server > onSendRequest > received offline message for online peer, relaying`,
          {
            peer,
            message: message.payload,
          }
        );
        this.client.send(peer.peerId.toString(), {
          topic: "/offline/get/response",
          payload: {
            requestId: message.payload.requestId,
            messages: [
              {
                sender: message.peer.did,
                createdAt: Date.now(),
                attempts: 0,
                ...message.payload,
              } as OfflineSyncRecord,
            ],
          },
        });
        return;
      } else {
        console.warn(
          `plugin/offlineSync/server > onSendRequest > received offline message for online peer, but no protocol handler found`,
          {
            peer,
            message: message.payload,
          }
        );
      }
    }

    await this.table()
      .insert({
        ...message.payload,
        sender: message.peer.did,
        createdAt: Date.now(),
        attempts: 0,
      })
      .then(() =>
        this.client.send(message.peer.peerId.toString(), {
          topic: "/offline/send/response",
          payload: {
            requestId: message.payload.requestId,
            saved: true,
          },
        })
      )
      .catch((e) =>
        this.client.send(message.peer.peerId.toString(), {
          topic: "/offline/send/response",
          payload: {
            requestId: message.payload.requestId,
            saved: false,
            error: e.message,
          },
        })
      );
  }

  async onGetRequest(
    message: IncomingP2PMessage<
      OfflineSyncServerEvents,
      "/offline/get/request",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/offlineSync/server > onGetRequest > peer does not have did`,
        message.peer
      );
      return;
    }

    if (!message.peer.peerId) {
      console.warn(
        `plugin/offlineSync/server > onGetRequest > peer does not have peerId`,
        message.peer
      );
      return;
    }

    const messages = await this.table()
      .query()
      .where("recipient", "=", message.peer.did)
      .select()
      .limit(message.payload.limit)
      .execute()
      .then((rows) => rows.all());

    console.info(`plugin/offlineSync/server > onGetRequest`, messages);

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/offline/get/response",
      payload: {
        requestId: message.payload.requestId,
        messages,
      },
    });
  }

  async onGetConfirmation(
    message: IncomingP2PMessage<
      OfflineSyncServerEvents,
      "/offline/get/confirmation",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      console.warn("onGetConfirmation > peer does not have did", message.peer);
      return;
    }

    if (!message.peer.peerId) {
      console.warn(
        "onGetConfirmation > peer does not have peerId",
        message.peer
      );
      return;
    }

    await this.table()
      .query()
      .where("recipient", "=", message.peer.did)
      .where("id", "in", message.payload.saved)
      .delete()
      .execute();

    if (message.payload.errors) {
      await this.table()
        .query()
        .where("recipient", "=", message.peer.did)
        .where("id", "in", Object.keys(message.payload.errors).map(Number))
        .update((row: OfflineSyncRecord) => {
          row.attempts = row.attempts + 1;
          return row;
        })
        .execute();
    }
  }
}

export default OfflineSyncServerPlugin;
