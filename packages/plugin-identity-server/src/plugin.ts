import { base58btc } from "multiformats/bases/base58";
import { IncomingP2PMessage } from "@cinderlink/core-types/src/p2p";
import all from "it-all";
import {
  PluginInterface,
  CinderlinkClientInterface,
  CinderlinkClientEvents,
  EncodingOptions,
  ReceiveEventHandlers,
} from "@cinderlink/core-types";
import { Schema } from "@cinderlink/ipld-database";
import { IdentityServerEvents } from "./types";

const logPurpose = `plugin-identity-server`;

export type IdentityPinsRecord = {
  id: number;
  uid: string;
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
    public client: CinderlinkClientInterface<IdentityServerEvents>,
    public options: Record<string, unknown> = {}
  ) {}
  async start() {
    this.client.logger.info(logPurpose, "start: starting social server plugin");
    if (!this.client.hasSchema("identity")) {
      const schema = new Schema(
        "identity",
        {
          pins: {
            schemaId: "identity",
            encrypted: true,
            aggregate: {},
            indexes: {
              did: {
                unique: true,
                fields: ["did"],
              },
              name: {
                fields: ["cid"],
              },
            },
            rollup: 1000,
            searchOptions: {
              fields: ["cid", "did"],
            },
            schema: {
              type: "object",
              properties: {
                did: { type: "string" },
                cid: { type: "string" },
              },
            },
          },
        },
        this.client.dag,
        this.client.logger.module("db").submodule(`schema:identity`)
      );
      await this.client.addSchema("identity", schema);
    } else {
      this.client.logger.info(
        logPurpose,
        "start: identity schema already exists"
      );
    }
  }
  async stop() {
    this.client.logger.info(logPurpose, "stop: social server plugin stopped");
  }
  p2p: ReceiveEventHandlers<IdentityServerEvents> = {
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
      this.client.logger.warn(
        logPurpose,
        "onSetRequest: refusing unauthenticated peer"
      );
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
    this.client.logger.info(
      logPurpose,
      "onSetRequest: setting identity for peer",
      message.payload
    );

    if (message.payload.cid) {
      const resolved = await this.client.ipfs.dag.resolve(message.payload.cid, {
        timeout: 5000,
      });
      this.client.logger.info(logPurpose, "onSetRequest: resolve", {
        resolved,
      });
    }

    await this.client
      .getSchema("identity")
      ?.getTable<IdentityPinsRecord>("pins")
      .upsert({ did: message.peer.did }, { cid: message.payload.cid });

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
      this.client.logger.warn(
        logPurpose,
        "onResolveRequest: refusing unauthenticated peer"
      );
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

    this.client.logger.info(
      logPurpose,
      "onResolveRequest: resolving identity for peer",
      { payload: message.payload, identity }
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
