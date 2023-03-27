import { IncomingP2PMessage } from "@cinderlink/core-types/src/p2p";
import {
  PluginInterface,
  CinderlinkClientInterface,
  CinderlinkClientEvents,
  EncodingOptions,
} from "@cinderlink/core-types";
import { Schema } from "@cinderlink/ipld-database";
import { IdentityServerEvents } from "./types";

const logPrefix = `/plugin/identityServer`;

export type IdentityPinsRecord = {
  id: number;
  uid: string;
  name: string;
  avatar: string;
  did: string;
  cid: string;
};

export class IdentityServerPlugin
  implements
    PluginInterface<
      IdentityServerEvents,
      CinderlinkClientInterface<IdentityServerEvents>
    >
{
  id = "identityServer";
  constructor(
    public client: CinderlinkClientInterface<IdentityServerEvents>,
    public options: Record<string, unknown> = {}
  ) {}
  async start() {
    console.info(`${logPrefix}: social server plugin started`);
    if (!this.client.hasSchema("identity")) {
      const schema = new Schema(
        "identity",
        {
          pins: {
            schemaId: "identity",
            encrypted: true,
            aggregate: {},
            indexes: {
              name: {
                fields: ["name"],
              },
              did: {
                unique: true,
                fields: ["did"],
              },
            },
            rollup: 1000,
            searchOptions: {
              fields: ["name"],
            },
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                avatar: { type: "string" },
                did: { type: "string" },
                cid: { type: "string" },
              },
            },
          },
        },
        this.client.dag
      );
      await this.client.addSchema("identity", schema);
    } else {
      console.info(`${logPrefix}: identity schema already exists`);
    }
  }
  async stop() {
    console.info(`${logPrefix}: social server plugin stopped`);
  }
  p2p = {
    "/identity/set/request": this.onSetRequest,
    "/identity/resolve/request": this.onResolveRequest,
  };
  pubsub = {};
  events = {};

  async onSetRequest(
    message: IncomingP2PMessage<
      IdentityServerEvents,
      "/identity/set/request",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      console.warn(`${logPrefix}/set: refusing unauthenticated peer`);
      return this.client.send<IdentityServerEvents, "/identity/set/response">(
        message.peer.peerId.toString(),
        {
          topic: "/identity/set/response",
          payload: {
            requestId: message.payload.requestId,
            success: false,
            error: "did not found, peer not authenticated",
          },
        }
      );
    }

    console.info(
      `${logPrefix}/set: setting identity for peer`,
      message.payload
    );
    await this.client
      .getSchema("identity")
      ?.getTable<IdentityPinsRecord>("pins")
      .upsert({ did: message.peer.did }, message.payload);
    await this.client.ipfs.pin.add(message.payload.cid, { recursive: true });

    return this.client.send(message.peer.peerId.toString(), {
      topic: "/identity/set/response",
      payload: {
        requestId: message.payload.requestId,
        success: true,
      },
    });
  }

  async onResolveRequest(
    message: IncomingP2PMessage<
      IdentityServerEvents,
      "/identity/resolve/request",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      console.warn(`${logPrefix}/resolve: refusing unauthenticated peer`);
      return this.client.send(message.peer.peerId.toString(), {
        topic: "/identity/resolve/response",
        payload: {
          requestId: message.payload.requestId,
          cid: undefined,
        },
      });
    }

    const identity = await this.client
      .getSchema("identity")
      ?.getTable<IdentityPinsRecord>("pins")
      .query()
      .where("did", "=", message.peer.did)
      .select()
      .execute()
      .then((r) => r.first());

    console.info(
      `${logPrefix}/resolve: resolving identity for peer`,
      message.payload,
      identity
    );
    return this.client.send<CinderlinkClientEvents>(
      message.peer.peerId.toString(),
      {
        topic: "/identity/resolve/response",
        payload: {
          requestId: message.payload.requestId,
          since: message.payload.since,
          cid: identity?.cid,
        },
      }
    );
  }
}

export default IdentityServerPlugin;
