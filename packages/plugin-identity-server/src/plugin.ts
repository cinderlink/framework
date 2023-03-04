import { IncomingP2PMessage } from "@candor/core-types/src/p2p";
import {
  PluginInterface,
  CandorClientInterface,
  CandorClientEvents,
  EncodingOptions,
} from "@candor/core-types";
import { Schema } from "@candor/ipld-database";
import { IdentityServerEvents } from "./types";

export type IdentityPinsRecord = {
  id: number;
  name: string;
  avatar: string;
  did: string;
  cid: string;
};

export class IdentityServerPlugin
  implements
    PluginInterface<
      IdentityServerEvents,
      CandorClientInterface<IdentityServerEvents>
    >
{
  id = "identityServer";
  constructor(
    public client: CandorClientInterface<IdentityServerEvents>,
    public options: Record<string, unknown> = {}
  ) {}
  async start() {
    console.info("social server plugin started");
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
  }
  async stop() {
    console.info("social server plugin stopped");
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
    await this.client
      .getSchema("identity")
      ?.getTable<IdentityPinsRecord>("pins")
      .upsert({ did: message.peer.did }, message.payload);

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

    return this.client.send<CandorClientEvents>(
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
