import { CinderlinkClientInterface, ZodPluginBase, TypedIncomingMessage, EventPayloadType } from "@cinderlink/core-types";

import {
  loadOfflineSyncSchema,
  OfflineSyncRecord,
} from "@cinderlink/plugin-offline-sync-core";
import { offlineSyncServerSchemas } from "./schemas";

export class OfflineSyncServerPlugin extends ZodPluginBase<typeof offlineSyncServerSchemas> {
  constructor(
    client: CinderlinkClientInterface,
    public options: Record<string, unknown> = {}
  ) {
    super("offline-sync-server", client, offlineSyncServerSchemas);
  }
  async start() {
    await this.initializeHandlers();
    this.logger.info(`loading schema`);
    await loadOfflineSyncSchema(this.client);
    this.started = true;
  }
  
  stop() {
    this.logger.info(`plugin stopped`);
    this.started = false;
  }

  // Define typed event handlers using the new type-safe approach
  protected getEventHandlers() {
    return {
      p2p: {
        '/offline/get/request': this.onGetRequest.bind(this),
        '/offline/get/confirmation': this.onGetConfirmation.bind(this),
        '/offline/send/request': this.onSendRequest.bind(this)
      }
    };
  }

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

  async onSendRequest(message: TypedIncomingMessage<EventPayloadType<typeof offlineSyncServerSchemas, 'receive', '/offline/send/request'>>) {
    const { payload } = message;
    
    if (!message.peer.peerId) {
      this.logger.warn(`peer does not have peerId`, message.peer);
      return;
    }

    if (!message.peer.did) {
      this.logger.warn(`peer does not have did`, message.peer);
      return;
    }

    // pin the CID for the user
    if ((payload.message as any).cid) {
      try {
        // Convert AsyncGenerator to Promise by consuming it
        for await (const _ of (this.client as any).ipfs.pins.add((payload.message as any).cid, {
          signal: AbortSignal.timeout(5000),
        })) {
          // Just consume the generator
        }
      } catch (_error) {
        // Ignore pin errors
      }
    }
    // if the recipient is online, just send the message
    if ((this.client as any).peers.isDIDConnected(payload.recipient)) {
      const peer = (this.client as any).peers.getPeerByDID(payload.recipient);

      if (peer && peer.connected) {
        this.logger.info(`received offline message for online peer, relaying`, {
          peer,
          message: payload,
        });

        await this.send(peer.peerId.toString(), "/offline/get/response", {
          timestamp: Date.now(),
          requestId: payload.requestId,
          messages: [
            {
              sender: message.peer.did,
              createdAt: Date.now(),
              attempts: 0,
              requestId: payload.requestId,
              recipient: payload.recipient,
              message: payload.message,
            } as OfflineSyncRecord,
          ],
        });
        return;
      } else {
        this.logger.warn(
          `received offline message for online peer, but no protocol handler found`,
          {
            peer,
            message: payload,
          }
        );
      }
    }

    await this.table()
      .insert({
        requestId: payload.requestId,
        recipient: payload.recipient,
        message: payload.message,
        sender: message.peer.did,
        createdAt: Date.now(),
        attempts: 0,
      } as any)
      .then(() =>
        this.send(message.peer.peerId.toString(), "/offline/send/response", {
          timestamp: Date.now(),
          requestId: payload.requestId,
          saved: true,
        })
      )
      .catch((e) =>
        this.send(message.peer.peerId.toString(), "/offline/send/response", {
          timestamp: Date.now(),
          requestId: payload.requestId,
          saved: false,
          error: e.message,
        })
      );
  }

  async onGetRequest(message: TypedIncomingMessage<EventPayloadType<typeof offlineSyncServerSchemas, 'receive', '/offline/get/request'>>) {
    const { payload } = message;
    
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
      .limit(payload.limit)
      .execute()
      .then((rows) => rows.all());

    await this.send(message.peer.peerId.toString(), "/offline/get/response", {
      timestamp: Date.now(),
      requestId: payload.requestId,
      messages,
    });
  }

  async onGetConfirmation(message: TypedIncomingMessage<EventPayloadType<typeof offlineSyncServerSchemas, 'receive', '/offline/get/confirmation'>>) {
    const { payload } = message;
    
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
      .where("id", "in", payload.saved)
      .delete()
      .execute();

    if (payload.errors) {
      await this.table()
        .query()
        .where("recipient", "=", message.peer.did)
        .where("id", "in", Object.keys(payload.errors).map(Number))
        .update((row: OfflineSyncRecord) => {
          row.attempts = row.attempts + 1;
          return row;
        })
        .execute();
    }
  }
}

export default OfflineSyncServerPlugin;
