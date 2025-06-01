import { SyncDBPlugin } from "@cinderlink/plugin-sync-db";
import { SocialSyncConfig } from "@cinderlink/plugin-social-core";
import {
  loadSocialSchema,
  SocialUser,
  SocialUsersGetRequest,
  SocialUsersGetResponse,
  SocialUsersSearchRequest,
  SocialUsersSearchResponse,
  SocialClientEvents,
  SocialUserPin,
  SocialUsersPinResponse,
  SocialUsersPinRequest,
} from "@cinderlink/plugin-social-core";
import type {
  PluginInterface,
  CinderlinkClientInterface,
  TableRow,
  TableDefinition,
  IncomingPubsubMessage,
  IncomingP2PMessage,
  EncodingOptions,
  SubLoggerInterface,
} from "@cinderlink/core-types";
import { checkAddressVerification } from "@cinderlink/identifiers";
import {} from "@cinderlink/plugin-social-core";

export type SocialServerEvents = {
  publish: {};
  subscribe: SocialClientEvents["subscribe"];
  send: {
    "/social/users/search/response": SocialUsersSearchResponse;
    "/social/users/get/response": SocialUsersGetResponse;
    "/social/users/pin/response": SocialUsersPinResponse;
  };
  receive: {
    "/social/users/search/request": SocialUsersSearchRequest;
    "/social/users/get/request": SocialUsersGetRequest;
    "/social/users/pin/request": SocialUsersPinRequest;
  };
  emit: {};
};

export class SocialServerPlugin<
  Client extends CinderlinkClientInterface<SocialServerEvents> = CinderlinkClientInterface<SocialServerEvents>
> implements PluginInterface<SocialServerEvents>
{
  id = "socialServer";
  logger: SubLoggerInterface;
  started = false;
  constructor(
    public client: Client,
    public options: Record<string, unknown> = {}
  ) {
    this.logger = this.client.logger
      .module("plugins")
      .submodule("socialServer");
  }
  async start() {
    this.logger.info(`loading schema`);
    await loadSocialSchema(this.client);

    this.logger.info(`registering sync config`);
    const syncDb: SyncDBPlugin = this.client.getPlugin("sync");
    if (syncDb) {
      Object.entries(SocialSyncConfig).map(([table, config]) => {
        syncDb.addTableSync("social", table, config);
      });
    }
    this.started = true;
  }
  async stop() {
    this.logger.info(`plugin stopped`);
    const syncDb: SyncDBPlugin = this.client.getPlugin("sync");
    if (syncDb) {
      Object.entries(SocialSyncConfig).map(([table]) => {
        syncDb.removeTableSync("social", table);
      });
    }
  }

  p2p = {
    "/social/users/announce": this.onPeerAnnounce,
    "/social/users/search/request": this.onUserSearchRequest,
    "/social/users/get/request": this.onUserGetRequest,
    "/social/users/pin/request": this.onUserPinRequest,
  };

  pubsub = {
    "/social/users/announce": this.onAnnounce,
    "/social/posts/create": this.onPostCreate,
    "/social/connections/create": this.onConnectionCreate,
  };

  events = {};

  async onPostCreate() {}
  async onConnectionCreate() {}

  get db() {
    const schema = this.client.getSchema("social");
    if (!schema) {
      throw new Error(`socialServer: schema not found`);
    }
    return schema;
  }

  table<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(name: string) {
    const table = this.db.getTable<Row, Def>(name);
    if (!table) {
      throw new Error(`socialServer: table "${name}" not found`);
    }
    return table;
  }

  async getUserByDID(did: string): Promise<SocialUser | undefined> {
    return this.table<SocialUser>("users")
      .query()
      .where("did", "=", did)
      .select()
      .execute()
      .then((result) => result.first() as SocialUser | undefined);
  }

  async getUser(uid: string): Promise<SocialUser | undefined> {
    return this.table("users")
      ?.query()
      .where("uid", "=", uid)
      .select()
      .execute()
      .then((result) => result.first() as SocialUser | undefined);
  }

  onAnnounce(
    message: IncomingPubsubMessage<
      SocialServerEvents,
      "/social/users/announce",
      EncodingOptions
    >
  ) {
    if (this.client.hasPlugin("socialClient")) return;
    if (!message.peer.did) {
      this.logger.warn(`received announce message from unauthorized peer`);

      return;
    }

    this.logger.debug(`peer announce received`, message);
    return this.saveUser(message.peer.did, {
      address: message.payload.address,
      addressVerification: message.payload.addressVerification,
      name: message.payload.name || "",
      bio: message.payload.bio || "",
      status: message.payload.status || "offline",
      avatar: message.payload.avatar || "",
      did: message.peer.did,
      updatedAt: message.payload.updatedAt || 0,
    });
  }

  async onPeerAnnounce(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/users/announce",
      EncodingOptions
    >
  ) {
    if (this.client.hasPlugin("socialClient")) return;
    if (!message.peer.did) {
      this.logger.warn(`received social announce message without peer did`);

      return;
    }
    if (!message.payload.address) {
      this.logger.warn(`received social announce message without peer address`);

      return;
    }
    if (!message.payload.addressVerification) {
      this.logger.warn(
        `received social announce message without peer address verification`
      );

      return;
    }

    const verified = await checkAddressVerification(
      "candor.social",
      message.peer.did,
      message.payload.address,
      message.payload.addressVerification
    ).catch(() => undefined);
    if (!verified) {
      this.logger.warn(
        `received social announce message with invalid peer address verification`
      );

      return;
    }

    this.logger.info(`received peer announce`, message);
    // get the existing user
    const existing = await this.getUserByDID(message.peer.did);
    if (
      existing &&
      existing.avatar &&
      existing.avatar !== message.payload.avatar
    ) {
      // unpin
      try {
        for await (const _ of this.client.ipfs.pins.rm(existing.avatar as any)) {
          // consume generator
        }
      } catch (error) {
        this.logger.debug("Failed to unpin avatar CID", {
          cid: existing.avatar,
          error,
        });
      }
    }

    // pin the new one
    if (message.payload.avatar) {
      try {
        await this.client.ipfs.pins.add(message.payload.avatar as any);
      } catch (error) {
        this.logger.debug("Failed to pin avatar CID", {
          cid: message.payload.avatar,
          error,
        });
      }
    }

    return this.saveUser(message.peer.did, {
      address: message.payload.address,
      addressVerification: message.payload.addressVerification,
      name: message.payload.name || "",
      bio: message.payload.bio || "",
      status: message.payload.status || "offline",
      avatar: message.payload.avatar || "",
      did: message.peer.did,
      updatedAt: message.payload.updatedAt || 0,
    });
  }

  async onUserSearchRequest(
    message: IncomingP2PMessage<
      SocialServerEvents,
      "/social/users/search/request",
      EncodingOptions
    >
  ) {
    this.logger.info(`received user search request`, {
      query: message.payload.query,
    });

    const table = this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users");

    if (!table) {
      this.logger.warn(`users table not found`);
      return;
    }

    const results = ((await table.search(message.payload.query, 20)) ||
      []) as SocialUser[];
    this.logger.info(`found ${results.length} matches`, {
      index: table.currentIndex,
    });

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/users/search/response",
      payload: {
        requestId: message.payload.requestId,
        results,
      },
    });
  }

  async onUserGetRequest(
    message: IncomingP2PMessage<
      SocialServerEvents,
      "/social/users/get/request",
      EncodingOptions
    >
  ) {
    this.logger.info(`received user get request`, {
      did: message.payload.did,
    });

    const table = this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users");

    if (!table) {
      this.logger.error(`users table not found`);
      return;
    }

    const user = await table
      .query()
      .where("did", "=", message.payload.did)
      .select()
      .execute()
      .then((r) => r.first());

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/users/get/response",
      payload: {
        requestId: message.payload.requestId,
        user,
      },
    });
  }

  async onUserPinRequest(
    message: IncomingP2PMessage<
      SocialServerEvents,
      "/social/users/pin/request",
      EncodingOptions
    >
  ) {
    const table = await this.table<SocialUserPin>("user_pins");
    if (!table) {
      this.logger.error(`user_pins table not found`);
      return;
    }

    if (!message.peer.did) {
      this.logger.error(`received social pin request message without peer did`);

      return;
    }

    // Pin the CID directly - resolve method was removed in Helia
    try {
      await this.client.ipfs.pins.add(message.payload.cid as any);
    } catch (error) {
      this.logger.debug("Failed to pin CID", {
        cid: message.payload.cid,
        error,
      });
    }

    // upsert the existing pin
    const pin = await table.upsert(
      {
        did: message.peer.did,
        cid: message.payload.cid,
        textId: message.payload.textId as string,
      },
      {
        cid: message.payload.cid,
        textId: message.payload.textId,
        updatedAt: Date.now(),
      }
    );

    return this.client.send(message.peer.peerId.toString(), {
      topic: "/social/users/pin/response",
      payload: {
        requestId: message.payload.requestId,
        pin,
      },
    });
  }

  async saveUser(did: string, user: Omit<Omit<SocialUser, "id">, "uid">) {
    const table = await this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users");

    if (!table) {
      this.logger.error(`users table not found`);
      return;
    }

    const existingUser = await table
      .query()
      .where("did", "=", did)
      .select()
      .execute()
      .then((r) => r.first());

    if (existingUser?.avatar) {
      // unpin the old avatar CID
      try {
        for await (const _ of this.client.ipfs.pins.rm(existingUser.avatar as any)) {
          // consume generator
        }
      } catch (error) {
        this.logger.debug("Failed to unpin avatar CID", {
          cid: existingUser.avatar,
          error,
        });
      }
    }

    // pin the avatar CID
    if (user.avatar) {
      try {
        await this.client.ipfs.pins.add(user.avatar as any);
      } catch (error) {
        this.logger.debug("Failed to pin avatar CID", {
          cid: user.avatar,
          error,
        });
      }
    }

    await table?.upsert({ did }, user);
  }
}

export default SocialServerPlugin;
