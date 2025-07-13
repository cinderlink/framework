import { CID } from "multiformats";
import { 
  TableDefinition, 
  TableRow,
  ZodPluginBase,
  CinderlinkClientInterface,
  TypedIncomingMessage,
  EventPayloadType
} from "@cinderlink/core-types";
import { Schema } from "@cinderlink/ipld-database";
import { identityServerSchemas } from "./schemas";

export type IdentityPinsRecord = {
  id: number;
  uid: string;
  name: string;
  avatar: string;
  did: string;
  cid: string;
};

export class IdentityServerPlugin extends ZodPluginBase<typeof identityServerSchemas> {
  constructor(
    client: CinderlinkClientInterface,
    public options: Record<string, unknown> = {}
  ) {
    super("identityServer", client, identityServerSchemas);
  }
  async start() {
    await this.initializeHandlers();
    this.logger.info("starting identity server plugin");
    
    // Set up database schema first
    if (!this.client.hasSchema("identity")) {
      const pinsDef: TableDefinition<IdentityPinsRecord> = {
        schemaId: "identity",
        schemaVersion: 1,
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
      };
      
      const schema = new Schema(
        "identity",
        {
          pins: pinsDef as TableDefinition<TableRow>,
        },
        this.client.dag,
        this.client.logger.module("db").submodule(`schema:identity`)
      );
      await this.client.addSchema("identity", schema);
    } else {
      this.logger.info("identity schema already exists");
    }
    
    // Mark as started
    this.started = true;
  }
  
  stop() {
    this.logger.info("identity server plugin stopped");
    this.started = false;
  }
  
  // Define typed event handlers using the new type-safe approach
  protected getEventHandlers() {
    return {
      p2p: {
        '/identity/set/request': this.onSetRequest.bind(this),
        '/identity/resolve/request': this.onResolveRequest.bind(this)
      }
    };
  }

  async onSetRequest(message: TypedIncomingMessage<EventPayloadType<typeof identityServerSchemas, 'receive', '/identity/set/request'>>) {
    const { payload } = message;
    
    if (!message.peer.did) {
      this.logger.warn("refusing to save identity for peer without DID");
      return this.send(
        message.peer.peerId.toString(),
        "/identity/set/response",
        {
          requestId: payload.requestId,
          success: false,
          error: "did not found, peer does not have a DID",
          timestamp: Date.now()
        }
      );
    }
    this.logger.info("setting identity for peer", payload);

    let success = false;
    if (payload.cid) {
      const cid = CID.parse(payload.cid);
      const resolved = await this.client.ipfs.blockstore.get(cid, {
        signal: AbortSignal.timeout(5000),
      });

      this.logger.info("identity resolved", {
        resolved,
      });

      if (resolved) {
        try {
          // Convert AsyncGenerator to Promise by consuming it
          for await (const _ of this.client.ipfs.pins.add(cid, { signal: AbortSignal.timeout(5000) })) {
            // Just consume the generator
          }
        } catch {
          // Ignore pin errors
        }
        success = true;
      }
    }

    await this.client
      .getSchema("identity")
      ?.getTable<IdentityPinsRecord>("pins")
      .upsert(
        { did: message.peer.did },
        { cid: success ? payload.cid : undefined }
      );

    return this.send(
      message.peer.peerId.toString(),
      "/identity/set/response",
      {
        requestId: payload.requestId,
        success,
        timestamp: Date.now()
      }
    );
  }

  async onResolveRequest(message: TypedIncomingMessage<EventPayloadType<typeof identityServerSchemas, 'receive', '/identity/resolve/request'>>) {
    const { payload } = message;
    
    if (!message.peer.did) {
      this.logger.warn("refusing peer without DID");
      return this.send(
        message.peer.peerId.toString(),
        "/identity/resolve/response",
        {
          requestId: payload.requestId,
          error: "DID not found, peer is not authenticated",
          cid: undefined,
          timestamp: Date.now()
        }
      );
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
      payload,
      identity,
    });

    return this.send(
      message.peer.peerId.toString(),
      "/identity/resolve/response",
      {
        requestId: payload.requestId,
        cid: identity?.cid,
        timestamp: Date.now()
      }
    );
  }
}

export default IdentityServerPlugin;
