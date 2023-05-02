import { CID } from "multiformats";
import { IncomingP2PMessage } from "@cinderlink/core-types/src/p2p";
import {
  PluginInterface,
  CinderlinkClientInterface,
  CinderlinkClientEvents,
  EncodingOptions,
  ReceiveEventHandlers,
  SubLoggerInterface,
} from "@cinderlink/core-types";
import { Schema } from "@cinderlink/ipld-database";
import { IdentityServerEvents } from "./types";

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
  logger: SubLoggerInterface;
  started = false;
  constructor(
    public client: CinderlinkClientInterface<IdentityServerEvents>,
    public options: Record<string, unknown> = {}
  ) {
    this.logger = client.logger.module("plugins").submodule("identityServer");
  }
  async start() {
    this.logger.info("starting social server plugin");
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
      this.logger.info("identity schema already exists");
    }
    this.started = true;
  }
  async stop() {
    this.logger.info("social server plugin stopped");
    this.started = false;
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
      this.logger.warn("refusing unauthenticated peer");
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
    this.logger.info("setting identity for peer", message.payload);

    let success = false;
    if (message.payload.cid) {
      const cid = CID.parse(message.payload.cid);
      const resolved = await this.client.ipfs.dag.get(cid, {
        timeout: 5000,
      });

      this.logger.info("resolve", {
        resolved,
      });

      if (resolved) {
        await this.client.ipfs.dht.provide(cid, {
          recursive: true,
          timeout: 5000,
        });
        await this.client.ipfs.pin.add(cid, { recursive: true, timeout: 5000 });
        success = true;
      }
    }

    await this.client
      .getSchema("identity")
      ?.getTable<IdentityPinsRecord>("pins")
      .upsert(
        { did: message.peer.did },
        { cid: success ? message.payload.cid : undefined }
      );

    return this.client.send(message.peer.peerId.toString(), {
      topic: "/identity/set/response",
      payload: {
        requestId: message.payload.requestId,
        success,
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
      this.logger.warn("refusing unauthenticated peer");
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

    this.logger.info("resolving identity for peer", {
      payload: message.payload,
      identity,
    });

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
