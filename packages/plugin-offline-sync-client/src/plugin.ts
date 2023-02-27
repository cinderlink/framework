import type {
  CandorClientInterface,
  EncodingOptions,
  IncomingP2PMessage,
  OutgoingP2PMessage,
  Peer,
  PluginEventDef,
  PluginInterface,
  ProtocolMessage,
  ProtocolRequest,
} from "@candor/core-types";
import Emittery from "emittery";
import { v4 as uuid } from "uuid";
import {
  loadOfflineSyncSchema,
  OfflineSyncGetConfirmation,
} from "@candor/plugin-offline-sync-core";
import { formatRelative } from "date-fns";
import {
  OfflineSyncClientEvents,
  OfflineSyncRecord,
} from "@candor/plugin-offline-sync-core";
import { CandorProtocolPlugin } from "@candor/protocol";

export class OfflineSyncClientPlugin<
    Client extends CandorClientInterface<OfflineSyncClientEvents> = CandorClientInterface<OfflineSyncClientEvents>
  >
  extends Emittery<OfflineSyncClientEvents["emit"]>
  implements PluginInterface<OfflineSyncClientEvents, Client>
{
  id = "offlineSyncClient";
  updatedAt = Date.now();
  interval: NodeJS.Timer | null = null;
  ready = false;

  p2p = {
    "/offline/send/response": this.onSendResponse,
    "/offline/get/request": this.onGetRequest,
    "/offline/get/response": this.onGetResponse,
    "/offline/get/confirmation": this.onGetConfirmation,
  };

  pubsub = {};

  pluginEvents = {
    "/candor/handshake/success": this.onPeerConnect,
  };

  constructor(
    public client: Client,
    public options: Record<string, unknown> = {}
  ) {
    super();
    // this.client.publish();
  }

  async start() {
    console.info(`plugin/offlineSyncServer > loading schema`);
    await loadOfflineSyncSchema(this.client);

    this.ready = true;
    console.info(`plugin/offlineSync/client > ready`);
    this.emit("ready", {});
  }

  async stop() {
    console.info(`plugin/offlineSync/client > stopping`);
  }

  async sendMessage<
    Events extends PluginEventDef = PluginEventDef,
    OutTopic extends keyof Events["send"] = keyof Events["send"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    recipient: string,
    outgoing: OutgoingP2PMessage<Events, OutTopic, Encoding>
  ): Promise<
    IncomingP2PMessage<
      OfflineSyncClientEvents,
      "/offline/send/response",
      Encoding
    >
  > {
    const requestId = uuid();
    const server = this.client.peers.getServers()[0];
    console.info(
      `plugin/offlineSync/client > sending offline message to server ${server.did} for ${recipient}: ${requestId}`
    );
    return this.client.request<
      OfflineSyncClientEvents,
      "/offline/send/request",
      "/offline/send/response",
      Encoding
    >(server.peerId.toString(), {
      topic: "/offline/send/request",
      payload: {
        requestId,
        recipient,
        message: outgoing,
      } as any,
    }) as any;
  }

  async onPeerConnect(peer: Peer) {
    console.info(
      `plugin/offlineSync/client > asking new peer for offline messages: ${peer.peerId}`
    );

    console.info(`plugin/offlineSync/client > sending get request`);
    await this.client.send(peer.peerId.toString(), {
      topic: "/offline/get/request",
      payload: {
        requestId: uuid(),
        limit: 100,
      },
    });
  }

  async onSendResponse(
    message: IncomingP2PMessage<
      OfflineSyncClientEvents,
      "/offline/send/response",
      EncodingOptions
    >
  ) {
    const { requestId, saved, error } = message.payload;
    if (!saved) {
      console.error(
        `plugin/offlineSync/client > server failed to save message: ${requestId}`
      );
      if (error) console.error(error);
      return;
    }

    this.emit(`/send/response/${requestId}`, message.payload);
  }

  async onGetRequest(
    message: IncomingP2PMessage<
      OfflineSyncClientEvents,
      "/offline/get/request",
      EncodingOptions
    >
  ) {
    const { requestId, limit } = message.payload;
    console.info(
      `plugin/offlineSync/client > handling get request from ${message.peer.did}: ${requestId}`
    );

    const table = this.client
      .getSchema("offlineSync")
      ?.getTable<OfflineSyncRecord>("messages");
    if (!table) {
      console.error(`plugin/offlineSync/client > no offlineSync table found`);
      return;
    }

    if (!message.peer.did) {
      console.error(
        `plugin/offlineSync/client > no did found for peer ${message.peer.peerId}`
      );
      return;
    }

    const messages = await table
      .query()
      .where("recipient", "=", message.peer.did)
      .limit(limit)
      .select()
      .execute()
      .then((res) => res.all());

    console.info(
      `plugin/offlineSync/client > sending ${messages.length} messages to ${message.peer.did}: ${requestId}`
    );

    await this.client.send<OfflineSyncClientEvents>(
      message.peer.peerId.toString(),
      {
        topic: "/offline/get/response",
        payload: {
          requestId,
          messages,
        },
      }
    );
  }

  async onGetResponse(
    response: IncomingP2PMessage<
      OfflineSyncClientEvents,
      "/offline/get/response",
      EncodingOptions
    >
  ) {
    const { requestId, messages } = response.payload;
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
      const connection = this.client.ipfs.libp2p.getConnections(peer.peerId)[0];
      await (this.client.getPlugin("candor") as CandorProtocolPlugin)
        ?.handleProtocolMessage<PluginEventDef, keyof PluginEventDef>(
          connection,
          message.payload as ProtocolMessage<
            ProtocolRequest,
            keyof PluginEventDef
          >
        )
        .then(() => {
          saved.push(record.id);
        })
        .catch((error) => {
          errors[record.id] = error.message;
        });
    }
    await this.client.send(response.peer.peerId.toString(), {
      topic: "/offline/get/confirmation",
      payload: {
        requestId,
        saved,
        errors,
      } as OfflineSyncGetConfirmation,
    });
  }

  async onGetConfirmation(
    response: IncomingP2PMessage<
      OfflineSyncClientEvents,
      "/offline/get/confirmation",
      EncodingOptions
    >
  ) {
    const { requestId, saved, errors } = response.payload;
    if (saved.length) {
      console.info(
        `plugin/offlineSync/client > server saved ${saved.length} messages: ${requestId}`
      );
    }

    if (errors && Object.keys(errors).length) {
      console.error(
        `plugin/offlineSync/client > server failed to save ${
          Object.keys(errors).length
        } messages: ${requestId}`
      );
      console.error(errors);
    }

    // delete the saved messages from the database
    const table = this.client
      .getSchema("offlineSync")
      ?.getTable<OfflineSyncRecord>("messages");
    if (!table) {
      console.error(`plugin/offlineSync/client > no offlineSync table found`);
      return;
    }

    await table.query().where("id", "in", saved).delete().execute();
  }
}

export default OfflineSyncClientPlugin;
