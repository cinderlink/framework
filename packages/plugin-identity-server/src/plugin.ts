import {
  PluginInterface,
  CandorClientInterface,
  P2PMessage,
  IdentityResolveRequest,
  IdentitySetRequest,
  CandorClientEventDef,
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
  implements PluginInterface<IdentityServerEvents>
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

  async onSetRequest(message: P2PMessage<string, IdentitySetRequest>) {
    if (!message.peer.did) {
      return this.client.send(message.peer.peerId.toString(), {
        topic: "/identity/set/response",
        data: {
          requestID: message.data.requestID,
          success: false,
          error: "did not found, peer not authenticated",
        },
      });
    }
    await this.client
      .getSchema("identity")
      ?.getTable("pins")
      .upsert("did", message.peer.did, message.data);

    return this.client.send(message.peer.peerId.toString(), {
      topic: "/identity/set/response",
      data: {
        requestID: message.data.requestID,
        success: true,
      },
    });
  }

  async onResolveRequest(message: P2PMessage<string, IdentityResolveRequest>) {
    if (!message.peer.did) {
      return this.client.send(message.peer.peerId.toString(), {
        topic: "/identity/resolve/response",
        data: {
          requestID: message.data.requestID,
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

    return this.client.send<CandorClientEventDef["send"]>(
      message.peer.peerId.toString(),
      {
        topic: "/identity/resolve/response",
        data: {
          requestID: message.data.requestID,
          cid: identity?.cid,
        },
      }
    );
  }
}

export default IdentityServerPlugin;
