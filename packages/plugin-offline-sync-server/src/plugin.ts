import type {
  PluginInterface,
  CandorClientInterface,
  P2PMessage,
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
  implements PluginInterface<OfflineSyncServerEvents>
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

  async onSendRequest(message: P2PMessage<string, OfflineSyncSendRequest>) {
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

    console.info(`plugin/offlineSync/server > onSendRequest`, message.data);
    // if the recipient is online, just send the message
    if (this.client.peers.isDIDConnected(message.data.recipient)) {
      const peer = this.client.peers.getPeerByDID(message.data.recipient);
      console.info(
        `plugin/offlineSync/server > onSendRequest > received offline message for online peer, relaying`,
        {
          peer,
          message: message.data,
          hasProtocol:
            peer?.peerId && !!this.client.protocol[peer.peerId.toString()],
        }
      );
      if (peer && this.client.protocol[peer.peerId.toString()]) {
        this.client.send(peer.peerId.toString(), {
          topic: "/offline/get/response",
          data: {
            requestId: message.data.requestId,
            messages: [
              {
                sender: message.peer.did,
                createdAt: Date.now(),
                attempts: 0,
                ...message.data,
              } as OfflineSyncRecord,
            ],
          },
        });
        return;
      }
    }

    await this.table()
      .insert({
        ...message.data,
        sender: message.peer.did,
        createdAt: Date.now(),
        attempts: 0,
      })
      .then(() =>
        this.client.send(message.peer.peerId.toString(), {
          topic: "/offline/send/response",
          data: {
            requestId: message.data.requestId,
            saved: true,
          },
        })
      )
      .catch((e) =>
        this.client.send(message.peer.peerId.toString(), {
          topic: "/offline/send/response",
          data: {
            requestId: message.data.requestId,
            saved: false,
            error: e.message,
          },
        })
      );
  }

  async onGetRequest(message: P2PMessage<string, OfflineSyncGetRequest>) {
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
      .limit(message.data.limit)
      .execute()
      .then((rows) => rows.all());

    console.info(`plugin/offlineSync/server > onGetRequest`, messages);

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/offline/get/response",
      data: {
        requestId: message.data.requestId,
        messages,
      },
    });
  }

  async onGetConfirmation(
    message: P2PMessage<string, OfflineSyncGetConfirmation>
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
      .where("id", "in", message.data.saved)
      .delete()
      .execute();

    if (message.data.errors) {
      await this.table()
        .query()
        .where("recipient", "=", message.peer.did)
        .where("id", "in", Object.keys(message.data.errors).map(Number))
        .update((row: OfflineSyncRecord) => {
          row.attempts = row.attempts + 1;
          return row;
        })
        .execute();
    }
  }
}

export default OfflineSyncServerPlugin;
