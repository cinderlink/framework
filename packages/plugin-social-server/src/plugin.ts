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
  constructor(
    public client: Client,
    public options: Record<string, unknown> = {},
    public logger: SubLoggerInterface
  ) {}
  async start() {
    this.logger.info(`start: loading schema`);
    await loadSocialSchema(this.client);

    this.logger.info(`start: registering sync config`);
    const syncDb: SyncDBPlugin = this.client.getPlugin("sync");
    if (syncDb) {
      Object.entries(SocialSyncConfig).map(([table, config]) => {
        syncDb.addTableSync("social", table, config);
      });
    }
  }
  async stop() {
    this.logger.info(`stop: plugin stopped`);
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
      throw new Error(`social-server > failed to get schema`);
    }
    return schema;
  }

  table<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(name: string) {
    const table = this.db.getTable<Row, Def>(name);
    if (!table) {
      throw new Error(`social-server > failed to get table ${name}`);
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
      this.logger.warn(
        `onAnnounce: received announce message from unauthorized peer`
      );

      return;
    }

    this.logger.info(`onAnnounce: received pubsub announce message`, message);

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
      this.logger.warn(
        `onPeerAnnounce: received social announce message without peer did`
      );

      return;
    }
    if (!message.payload.address) {
      this.logger.warn(
        `onPeerAnnounce: received social announce message without peer address`
      );

      return;
    }
    if (!message.payload.addressVerification) {
      this.logger.warn(
        `onPeerAnnounce: received social announce message without peer address verification`
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
        `onPeerAnnounce: received social announce message with invalid peer address verification`
      );

      return;
    }

    this.logger.info(`onPeerAnnounce: received peer announce message`, message);

    // get the existing user
    const existing = await this.getUserByDID(message.peer.did);
    if (
      existing &&
      existing.avatar &&
      existing.avatar !== message.payload.avatar
    ) {
      // unpin
      await this.client.ipfs.pin.rm(existing.avatar).catch(() => {});
    }

    // pin the new one
    if (message.payload.avatar) {
      await this.client.ipfs.pin.add(message.payload.avatar);
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
    this.logger.info(`onUserSearchRequest: received user search request`, {
      query: message.payload.query,
    });

    const table = this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users");

    if (!table) {
      this.logger.warn(`onUserSearchRequest: users table not found`);
      return;
    }

    const results = ((await table.search(message.payload.query, 20)) ||
      []) as SocialUser[];
    this.logger.info(`onUserSearchRequest: found ${results.length} matches`, {
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
    this.logger.info(`onUserGetRequest: received user get request`, {
      did: message.payload.did,
    });

    const table = this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users");

    if (!table) {
      this.logger.warn(`onUserGetRequest: users table not found`);
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
      this.logger.warn(`onUserPinRequest: user_pins table not found`);
      return;
    }

    if (!message.peer.did) {
      this.logger.warn(
        `onUserPinRequest: received social pin request message without peer did`
      );

      return;
    }

    const resolved = await this.client.ipfs
      .resolve(message.payload.cid, { recursive: true, timeout: 5000 })
      .catch(() => {});
    if (resolved) {
      await this.client.ipfs.pin.add(message.payload.cid, {
        recursive: true,
        timeout: 3000,
      });

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

    return this.client.send(message.peer.peerId.toString(), {
      topic: "/social/users/pin/response",
      payload: {
        requestId: message.payload.requestId,
        error: "Failed to resolve CID",
      },
    });
  }

  async saveUser(did: string, user: Omit<Omit<SocialUser, "id">, "uid">) {
    this.logger.info(`saveUser: saving user`, {
      did,
      user,
    });

    const table = await this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users");

    if (!table) {
      this.logger.warn(`saveUser: users table not found`);
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
      await this.client.ipfs.pin
        .rm(existingUser.avatar as string)
        .catch(() => {});
    }

    // pin the avatar CID
    if (user.avatar) {
      await this.client.ipfs.pin.add(user.avatar);
    }

    await table?.upsert({ did }, user);
  }
}

export default SocialServerPlugin;
