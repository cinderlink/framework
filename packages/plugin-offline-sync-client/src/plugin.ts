import { CinderlinkClientInterface, OutgoingP2PMessage, Peer, PluginEventDef, ProtocolMessage, ProtocolRequest, ZodPluginBase, TypedIncomingMessage, EventPayloadType } from "@cinderlink/core-types";

import { v4 as uuid } from "uuid";
import { loadOfflineSyncSchema, OfflineSyncRecord } from "@cinderlink/plugin-offline-sync-core";
import { formatRelative } from "date-fns";

import { offlineSyncClientSchemas } from "./schemas";
export class OfflineSyncClientPlugin extends ZodPluginBase<typeof offlineSyncClientSchemas> {
  interval: number | null = null;

  constructor(
    client: CinderlinkClientInterface,
    public options: Record<string, unknown> = {}
  ) {
    super("offlineSyncClient", client, offlineSyncClientSchemas);
  }

  async start() {
    await this.initializeHandlers();
    this.logger.info(`starting offline sync client plugin`);

    await loadOfflineSyncSchema(this.client);
    this.logger.info(`loaded offline-sync-client schema`);

    (this.client as any).on("/peer/authenticated", this.onPeerConnect.bind(this));

    this.started = true;
    this.logger.info(`plugin is ready`);
  }

  stop() {
    this.logger.info(`stopping plugin`);
    (this.client as any).off("/peer/authenticated", this.onPeerConnect.bind(this));
    this.started = false;
  }

  // Define typed event handlers using the new type-safe approach
  protected getEventHandlers() {
    return {
      p2p: {
        '/offline/send/response': this.onSendResponse.bind(this),
        '/offline/get/request': this.onGetRequest.bind(this),
        '/offline/get/response': this.onGetResponse.bind(this),
        '/offline/get/confirmation': this.onGetConfirmation.bind(this)
      }
    };
  }

  async sendMessage<
    Events extends PluginEventDef = PluginEventDef,
    OutTopic extends keyof Events["send"] = keyof Events["send"]
  >(
    recipient: string,
    outgoing: OutgoingP2PMessage<Events, OutTopic>
  ): Promise<boolean> {
    const requestId = uuid();
    const servers = (this.client as any).peers.getServers();
    let saved = false;
    for (const server of servers) {
      this.logger.info(`sending offline message to server`, {
        server: server.did,
        recipient,
        requestId,
      });

      const received = await (this.client as any).request(
        server.peerId.toString(), {
        topic: "/offline/send/request",
        payload: {
          requestId,
          recipient,
          message: outgoing,
        },
      });

      if (received?.payload.saved) {
        saved = true;
      }
    }
    return saved;
  }
  onPeerConnect(peer: Peer) {
    this.logger.info(`peer connected, asking for offline messages`, {
      peerId: peer.peerId.toString(),
    });

    await (this.client as any).send(peer.peerId.toString(), {
      topic: "/offline/get/request",
      payload: {
        requestId: uuid(),
        limit: 100,
      },
    });
  }

  onSendResponse(message: TypedIncomingMessage<EventPayloadType<typeof offlineSyncClientSchemas, 'receive', '/offline/send/response'>>) {
    const { payload } = message;
    
    const { requestId, saved, error } = payload;
    if (!saved) {
      this.logger.error(`server failed to save message`, {
        requestId,
      });

      if (error)
        this.logger.error(`server error`, {
          error,
        });
      return;
    }

    // Note: ZodPluginBase doesn't support emit patterns, using client directly
    (this.client as any).emit(`/send/response/${requestId}`, payload);
  }

  async onGetRequest(message: TypedIncomingMessage<EventPayloadType<typeof offlineSyncClientSchemas, 'receive', '/offline/get/request'>>) {
    const { payload } = message;
    
    const { requestId, limit } = payload;
    this.logger.info(`handling get request`, {
      from: message.peer.did,
      requestId,
    });

    const table = this.client
      .getSchema("offlineSync")
      ?.getTable<OfflineSyncRecord>("messages");
    if (!table) {
      this.logger.error(`no offline-sync table found`);
      return;
    }

    if (!message.peer.did) {
      this.logger.error(`no did found for peer`, {
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
      `sending ${messages.length} messages to ${message.peer.did}`,
      { requestId }
    );

    await this.send(
      message.peer.peerId.toString(),
      "/offline/get/response",
      {
        timestamp: Date.now(),
        requestId,
        messages,
      }
    );
  }

  async onGetResponse(response: TypedIncomingMessage<EventPayloadType<typeof offlineSyncClientSchemas, 'receive', '/offline/get/response'>>) {
    const { payload } = response;
    
    const { requestId, messages } = payload;
    if (!messages.length) {
      this.logger.info(`server has no offline messages`, {
        requestId,
      });

      return;
    }

    this.logger.info(`server has ${messages.length} offline messages`, {
      requestId,
    });
    let saved: number[] = [];
    let errors: Record<number, string> = {};
    // each of the records contains an encrypted P2P message that we need to decrypt
    // and emit as a normal message
    for (const record of messages) {
      const { message, sender, createdAt = 0 } = record;
      this.logger.info(`handling protocol message from ${sender}`, {
        record,
        date: formatRelative(createdAt, new Date()),
      });

      let peer: Peer = (this.client as any).peers.getPeer(sender);
      if (!peer) {
        peer = {
          peerId: response.peer.peerId as any,
          did: sender,
          connected: true,
          metadata: {},
          role: "peer",
          subscriptions: [],
        };
      }
      const connection = (this.client as any).ipfs.libp2p.getConnections(peer.peerId)[0];
      await ((this.client as any)
        .getPlugin("cinderlink") as any)
        ?.handleProtocolMessage(
          connection,
          message.payload as ProtocolMessage<
            ProtocolRequest,
            keyof PluginEventDef
          >
        )
        .then(() => {
          saved.push(record.id);
        })
        .catch((error: any) => {
          errors[record.id] = error.message;
        });
    }
    await this.send(response.peer.peerId.toString(), "/offline/get/confirmation", {
      timestamp: Date.now(),
      requestId,
      saved,
      errors,
    });
  }

  async onGetConfirmation(response: TypedIncomingMessage<EventPayloadType<typeof offlineSyncClientSchemas, 'receive', '/offline/get/confirmation'>>) {
    const { payload } = response;
    
    const { requestId, saved, errors } = payload;
    if (saved.length) {
      this.logger.info(`server saved ${saved.length} messages`, { requestId });
    }

    if (errors && Object.keys(errors).length) {
      this.logger.error(
        `server failed to save ${Object.keys(errors).length} messages`,
        { requestId }
      );

      this.logger.error(`errors`, {
        errors,
      });
    }

    // delete the saved messages from the database
    const table = this.client
      .getSchema("offlineSync")
      ?.getTable<OfflineSyncRecord>("messages");
    if (!table) {
      this.logger.error(`no offline-sync table found`);
      return;
    }

    await table.query().where("id", "in", saved).delete().execute();
  }
}

export default OfflineSyncClientPlugin;
