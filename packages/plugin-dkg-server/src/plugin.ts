import type {
  PluginInterface,
  CryptidsClient,
  PubsubMessage,
  IdentityResolveResponse,
} from "@cryptids/client";
import { Schema } from "@cryptids/ipld-database";
import {
  IdentityResolveRequest,
  IdentityServerEvents,
  IdentitySetRequest,
} from "./types";

export type IdentityPinsRecord = {
  id?: number;
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
    public client: CryptidsClient<IdentityServerEvents>,
    public options: Record<string, unknown> = {}
  ) {}
  async start() {
    console.info("social server plugin started");
    const schema = new Schema(
      "identity",
      {
        pins: {
          encrypted: true,
          aggregate: {},
          indexes: ["name", "did"],
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

  async onSetRequest(message: PubsubMessage<IdentitySetRequest>) {
    await this.client
      .getSchema("identity")
      .getTable("pins")
      .upsert("did", message.peer.did, message.data);

    return this.client.send(message.peer.did, {
      topic: "/identity/set/response",
      requestID: message.data.requestID,
      success: true,
    });
  }

  async onResolveRequest(message: PubsubMessage<IdentityResolveRequest>) {
    const identity = await this.client
      .getSchema("identity")
      .getTable<IdentityPinsRecord>("pins")
      .findByIndex("did", message.peer.did);

    return this.client.send(message.peer.did, {
      topic: "/identity/resolve/response",
      requestID: message.data.requestID,
      cid: identity?.cid,
    } as IdentityResolveResponse);
  }
}

export default IdentityServerPlugin;
