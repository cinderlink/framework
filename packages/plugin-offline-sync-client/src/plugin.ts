import type {
  CandorClientInterface,
  Peer,
  P2PMessage,
  EncodedP2PMessage,
  PluginEventDef,
} from "@candor/core-types";
import Emittery from "emittery";
import { v4 as uuid } from "uuid";
import {
  OfflineSyncGetConfirmation,
  OfflineSyncSendResponse,
  OfflineSyncGetResponse,
} from "@candor/plugin-offline-sync-core";
import { formatRelative } from "date-fns";
import {
  OfflineSyncClientEvents,
  OfflineSyncClientPluginInterface,
} from "@candor/plugin-offline-sync-core";

export class OfflineSyncClientPlugin<
    PluginEvents extends OfflineSyncClientEvents = OfflineSyncClientEvents
  >
  extends Emittery<OfflineSyncClientEvents["emit"]>
  implements OfflineSyncClientPluginInterface
{
  id = "offlineSyncClient";
  updatedAt = Date.now();
  interval: NodeJS.Timer | null = null;
  ready = false;

  p2p = {
    "/offline/send/response": this.onSendResponse,
    "/offline/get/response": this.onGetResponse,
  };

  pubsub = {};

  coreEvents = {
    "/peer/handshake": this.onPeerConnect,
  };

  constructor(
    public client: CandorClientInterface<PluginEvents>,
    public options: Record<string, unknown> = {}
  ) {
    super();
    // this.client.publish();
  }

  async start() {
    this.ready = true;
    console.info(`plugin/offlineSync/client > ready`);
    this.emit("ready", undefined);
  }

  async stop() {
    console.info(`plugin/offlineSync/client > stopping`);
  }

  async sendMessage<
    E extends PluginEventDef["send"] = PluginEventDef["send"],
    K extends keyof E = keyof E
  >(recipient: string, encoded: EncodedP2PMessage<E, K>) {
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
        message: encoded,
      },
    }) as Promise<P2PMessage<string, OfflineSyncClientEvents["receive"]>>;
  }

  async onPeerConnect(peer: Peer) {
    if (!this.client.peers.hasServer(peer.peerId.toString())) return;

    console.info(
      `plugin/offlineSync/client > asking new server for offline messages: ${peer.peerId}`
    );

    console.info(`plugin/offlineSync/client > sending get request`);
    await this.client.send(peer.peerId.toString(), {
      topic: "/offline/get/request",
      data: {
        requestId: uuid(),
        limit: 100,
      },
    });
  }

  async onSendResponse(message: P2PMessage<string, OfflineSyncSendResponse>) {
    const { requestId, saved, error } = message.data;
    if (!saved) {
      console.error(
        `plugin/offlineSync/client > server failed to save message: ${requestId}`
      );
      if (error) console.error(error);
      return;
    }

    this.emit(`/send/response/${requestId}`, message.data);
  }

  async onGetResponse(response: P2PMessage<string, OfflineSyncGetResponse>) {
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
    let saved: number[] = [];
    let errors: Record<number, string> = {};
    // each of the records contains an encrypted P2P message that we need to decrypt
    // and emit as a normal message
    for (const record of messages) {
      console.info(
        `plugin/offlineSync/client > handling incoming message ${record.requestId}`,
        record
      );
      const { message, sender, createdAt = 0 } = record;
      console.info(
        `plugin/offlineSync/client > handling candor message from ${sender} (${formatRelative(
          createdAt,
          new Date()
        )})`
      );
      let peer: Peer = this.client.peers.getPeer(sender);
      if (!peer) {
        peer = {
          peerId: response.peer.peerId,
          did: sender,
          authenticated: true,
          connected: false,
          metadata: {},
          role: "peer",
          subscriptions: [],
        };
      }
      await this.client
        .handleEncodedMessage(message as EncodedP2PMessage<any, any>, peer)
        .then(() => {
          saved.push(record.id);
        })
        .catch((error) => {
          errors[record.id] = error.message;
        });
    }
    await this.client.send(response.peer.peerId.toString(), {
      topic: "/offline/get/confirmation",
      data: {
        requestId,
        saved,
        errors,
      } as OfflineSyncGetConfirmation,
    });
  }
}

export default OfflineSyncClientPlugin;
