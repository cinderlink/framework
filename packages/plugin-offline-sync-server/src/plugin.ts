import type {
  PluginInterface,
  CinderlinkClientInterface,
  IncomingP2PMessage,
  EncodingOptions,
  ProtocolEvents,
  SubLoggerInterface,
} from "@cinderlink/core-types";
import {
  loadOfflineSyncSchema,
  OfflineSyncGetConfirmation,
  OfflineSyncGetRequest,
  OfflineSyncGetResponse,
  OfflineSyncRecord,
  OfflineSyncSendRequest,
  OfflineSyncSendResponse,
} from "@cinderlink/plugin-offline-sync-core";

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
  implements PluginInterface<OfflineSyncServerEvents, ProtocolEvents>
{
  id = "offline-sync-server";
  logger: SubLoggerInterface;
  started = false;
  constructor(
    public client: CinderlinkClientInterface<OfflineSyncServerEvents>,
    public options: Record<string, unknown> = {}
  ) {
    this.logger = this.client.logger.module("plugins").submodule("offlineSync");
  }
  async start() {
    this.logger.info(`loading schema`);
    await loadOfflineSyncSchema(this.client);
    this.started = true;
  }
  async stop() {
    this.logger.info(`plugin stopped`);
    this.started = false;
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
      this.logger.error(`schema not found`);
      throw new Error(`offlineSync: schema not found`);
    }
    return schema;
  }

  table() {
    const table = this.db.getTable<OfflineSyncRecord>("messages");
    if (!table) {
      this.logger.error(`table not found`);
      throw new Error(`offlineSync: table not found ${name}`);
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
      this.logger.warn(`peer does not have peerId`, message.peer);

      return;
    }

    if (!message.peer.did) {
      this.logger.warn(`peer does not have did`, message.peer);

      return;
    }

    // pin the CID for the user
    if ((message.payload as any).message.cid) {
      await this.client.ipfs.pin.add((message.payload as any).message.cid, {
        recursive: true,
      });
    }
    // if the recipient is online, just send the message
    if (this.client.peers.isDIDConnected(message.payload.recipient)) {
      const peer = this.client.peers.getPeerByDID(message.payload.recipient);

      if (peer && peer.connected) {
        this.logger.info(`received offline message for online peer, relaying`, {
          peer,
          message: message.payload,
        });

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
        this.logger.warn(
          `received offline message for online peer, but no protocol handler found`,
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
      this.logger.warn(`peer does not have did`, message.peer);

      return;
    }

    if (!message.peer.peerId) {
      this.logger.warn(`peer does not have peerId`, message.peer);

      return;
    }

    const messages = await this.table()
      .query()
      .where("recipient", "=", message.peer.did)
      .select()
      .limit(message.payload.limit)
      .execute()
      .then((rows) => rows.all());

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
      this.logger.error(`peer does not have did`, message.peer);
      return;
    }

    if (!message.peer.peerId) {
      this.logger.error(`peer does not have peerId`, message.peer);

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
