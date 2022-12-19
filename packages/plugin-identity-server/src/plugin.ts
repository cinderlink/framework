import type {
  PluginInterface,
  CryptidsClient,
  PubsubMessage,
} from "@cryptids/client";
import { object, string, optional } from "superstruct";
import { Schema } from "@cryptids/ipld-database";
import {
  IdentityResolveRequest,
  IdentityServerEvents,
  IdentitySetRequest,
} from "./types";

export class IdentityServerPlugin
  implements PluginInterface<IdentityServerEvents>
{
  id = "socialServer";
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
          aggregate: {},
          indexes: ["name"],
          rollup: 1000,
          searchOptions: {
            fields: ["name"],
          },
          schema: object({
            name: string(),
            avatar: optional(string()),
            cid: string(),
          }),
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

  onSetRequest(message: PubsubMessage<IdentitySetRequest>) {
    this.client.getSchema("identity").getTable("pins").insert(message.data);
  }

  onResolveRequest(message: PubsubMessage<IdentityResolveRequest>) {
    console.log("resolve identity request", message);
  }
}

export default IdentityServerPlugin;
