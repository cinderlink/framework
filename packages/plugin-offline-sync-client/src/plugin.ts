import type {
  CinderlinkClientInterface,
  EncodingOptions,
  IncomingP2PMessage,
  OutgoingP2PMessage,
  Peer,
  PluginEventDef,
  PluginEventHandlers,
  PluginInterface,
  ProtocolEvents,
  ProtocolMessage,
  ProtocolRequest,
  ReceiveEventHandlers,
  SubLoggerInterface,
  SubscribeEventHandlers,
} from "@cinderlink/core-types";
import Emittery from "emittery";
import { v4 as uuid } from "uuid";
import {
  loadOfflineSyncSchema,
  OfflineSyncGetConfirmation,
} from "@cinderlink/plugin-offline-sync-core";
import { formatRelative } from "date-fns";
import {
  OfflineSyncClientEvents,
  OfflineSyncRecord,
} from "@cinderlink/plugin-offline-sync-core";
import { CinderlinkProtocolPlugin } from "@cinderlink/protocol";
export class OfflineSyncClientPlugin<
    Client extends CinderlinkClientInterface<
      OfflineSyncClientEvents & ProtocolEvents
    > = CinderlinkClientInterface<OfflineSyncClientEvents & ProtocolEvents>
  >
  extends Emittery<OfflineSyncClientEvents["emit"]>
  implements PluginInterface<OfflineSyncClientEvents, ProtocolEvents, Client>
{
  id = "offlineSyncClient";
  updatedAt = Date.now();
  interval: number | null = null;
  ready = false;

  p2p: ReceiveEventHandlers<OfflineSyncClientEvents> = {
    "/offline/send/response": this.onSendResponse,
    "/offline/get/request": this.onGetRequest,
    "/offline/get/response": this.onGetResponse,
    "/offline/get/confirmation": this.onGetConfirmation,
  };

  pubsub: SubscribeEventHandlers<OfflineSyncClientEvents & ProtocolEvents> = {};

  pluginEvents: PluginEventHandlers<ProtocolEvents["emit"]> = {
    "/cinderlink/handshake/success": this.onPeerConnect,
  };

  constructor(
    public client: Client,
    public options: Record<string, unknown> = {},
    public logger: SubLoggerInterface
  ) {
    super();
    // this.client.publish();
  }

  async start() {
    this.logger.info(`start: starting offline sync client plugin`);

    await loadOfflineSyncSchema(this.client);
    this.logger.info(`start: loaded offline-sync-client schema`);

    this.ready = true;
    this.logger.info(`start: plugin is ready`);

    this.emit("ready", {});
  }

  async stop() {
    this.logger.info(`stop: stopping plugin`);
  }

  async sendMessage<
    Events extends PluginEventDef = PluginEventDef,
    OutTopic extends keyof Events["send"] = keyof Events["send"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    recipient: string,
    outgoing: OutgoingP2PMessage<Events, OutTopic, Encoding>
  ): Promise<boolean> {
    const requestId = uuid();
    const servers = this.client.peers.getServers();
    let saved = false;
    for (const server of servers) {
      this.logger.info(`sendMessage: sending offline message to server`, {
        server: server.did,
        recipient,
        requestId,
      });

      const received = (await this.client.request<
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
      })) as IncomingP2PMessage<
        OfflineSyncClientEvents,
        "/offline/send/response"
      >;

      if (received?.payload.saved) {
        saved = true;
      }
    }
    return saved;
  }

  async onPeerConnect(peer: Peer) {
    this.logger.info(`onPeerConnect: asking new peer for offline messages`, {
      peerId: peer.peerId.toString(),
    });

    await this.client.send(peer.peerId.toString(), {
      topic: "/offline/get/request",
      payload: {
        requestId: uuid(),
        limit: 100,
      },
    });
    this.logger.info(`onPeerConnect: /offline/get/request sent`, {
      to: peer.peerId.toString(),
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
      this.logger.error(`onSendResponse: server failed to save message`, {
        requestId,
      });

      if (error)
        this.logger.error(`onSendResponse: error`, {
          error,
        });
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
    this.logger.info(`onGetRequest: handling request`, {
      from: message.peer.did,
      requestId,
    });

    const table = this.client
      .getSchema("offlineSync")
      ?.getTable<OfflineSyncRecord>("messages");
    if (!table) {
      this.logger.error(`onGetRequest: no offline-sync table found`);
      return;
    }

    if (!message.peer.did) {
      this.logger.error(`onGetRequest: no did found for peer`, {
        peerId: message.peer.peerId,
      });

      return;
    }

    const messages = await table
      .query()
      .where("recipient", "=", message.peer.did)
      .limit(limit)
      .select()
      .execute()
      .then((res) => res.all());

    this.logger.info(
      `onGetRequest: sending ${messages.length} messages to ${message.peer.did}`,
      { requestId }
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
      this.logger.info(`onGetResponse: server has no offline messages`, {
        requestId,
      });

      return;
    }

    this.logger.info(
      `onGetResponse: server has ${messages.length} offline messages`,
      { requestId }
    );
    let saved: number[] = [];
    let errors: Record<number, string> = {};
    // each of the records contains an encrypted P2P message that we need to decrypt
    // and emit as a normal message
    for (const record of messages) {
      const { message, sender, createdAt = 0 } = record;
      this.logger.info(
        `onGetResponse: handling cinderlink message from ${sender}`,
        { record, date: formatRelative(createdAt, new Date()) }
      );

      let peer: Peer = this.client.peers.getPeer(sender);
      if (!peer) {
        peer = {
          peerId: response.peer.peerId,
          did: sender,
          authenticated: true,
          connected: true,
          metadata: {},
          role: "peer",
          subscriptions: [],
        };
      }
      const connection = this.client.ipfs.libp2p.getConnections(peer.peerId)[0];
      await this.client
        .getPlugin<CinderlinkProtocolPlugin>("cinderlink")
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
      this.logger.info(
        `onGetConfirmation: server saved ${saved.length} messages`,
        { requestId }
      );
    }

    if (errors && Object.keys(errors).length) {
      this.logger.error(
        `onGetConfirmation: server failed to save ${
          Object.keys(errors).length
        } messages`,
        { requestId }
      );

      this.logger.error(`onGetConfirmation: errors`, {
        errors,
      });
    }

    // delete the saved messages from the database
    const table = this.client
      .getSchema("offlineSync")
      ?.getTable<OfflineSyncRecord>("messages");
    if (!table) {
      this.logger.error(`onGetConfirmation: no offline-sync table found`);
      return;
    }

    await table.query().where("id", "in", saved).delete().execute();
  }
}

export default OfflineSyncClientPlugin;
