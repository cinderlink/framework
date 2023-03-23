import {
  loadSocialSchema,
  SocialConnection,
  SocialPost,
  SocialPostsFetchRequest,
  SocialPostsFetchResponse,
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
    "/social/posts/fetch/response": SocialPostsFetchResponse;
  };
  receive: {
    "/social/updates/request": SocialPostsFetchRequest;
    "/social/users/search/request": SocialUsersSearchRequest;
    "/social/users/get/request": SocialUsersGetRequest;
    "/social/users/pin/request": SocialUsersPinRequest;
  };
  emit: {};
};

export class SocialServerPlugin<
  Client extends CinderlinkClientInterface<SocialClientEvents> = CinderlinkClientInterface<SocialClientEvents>
> implements PluginInterface<SocialServerEvents, Client>
{
  id = "socialServer";
  constructor(
    public client: Client,
    public options: Record<string, unknown> = {}
  ) {}
  async start() {
    console.info(`plugin/social/server > loading schema`);
    await loadSocialSchema(this.client);
  }
  async stop() {
    console.info("social server plugin stopped");
  }

  p2p = {
    "/social/users/announce": this.onPeerAnnounce,
    "/social/connections/create": this.onPeerConnection,
    "/social/users/search/request": this.onUserSearchRequest,
    "/social/users/get/request": this.onUserGetRequest,
    "/social/updates/request": this.onUpdatesRequest,
    "/social/users/pin/request": this.onUserPinRequest,
  };

  pubsub = {
    "/social/posts/create": this.onUpdate,
    "/social/users/announce": this.onAnnounce,
    "/social/connections/create": this.onConnection,
  };

  events = {};

  get db() {
    const schema = this.client.getSchema("social");
    if (!schema) {
      throw new Error(`plugin/social/server > failed to get schema`);
    }
    return schema;
  }

  table<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(name: string) {
    const table = this.db.getTable<Row, Def>(name);
    if (!table) {
      throw new Error(`plugin/social/server > failed to get table ${name}`);
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

  async getUser(userId: number): Promise<SocialUser | undefined> {
    return this.table("users")
      ?.query()
      .where("id", "=", userId)
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
      console.warn(
        `plugin/social/server > received announce message from unauthorized peer`
      );
      return;
    }

    console.info(
      `plugin/social/server > received pubsub announce message (did: ${message.peer.did})`,
      message
    );
    return this.saveUser(message.peer.did, {
      address: message.payload.address,
      addressVerification: message.payload.addressVerification,
      name: message.payload.name,
      bio: message.payload.bio,
      status: message.payload.status,
      avatar: message.payload.avatar,
      did: message.peer.did,
      updatedAt: message.payload.updatedAt,
    });
  }

  async onUpdate(
    message: IncomingPubsubMessage<
      SocialServerEvents,
      "/social/posts/create",
      EncodingOptions
    >
  ) {
    const { id, did, cid, ...post } = message.payload;
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social update message from unauthorized peer`
      );
      return;
    }

    const user = await this.getUserByDID(did);
    if (!user) {
      console.warn(
        `plugin/social/client > received social update message for unknown user: ${did}`
      );
      return;
    }

    console.info(`plugin/social/client > storing social update message`, {
      ...post,
      did,
    });
    await this.table<SocialPost>("posts").upsert(
      { cid },
      {
        ...post,
        did,
      }
    );
  }

  async onUpdatesRequest(
    message: IncomingP2PMessage<
      SocialServerEvents,
      "/social/updates/request",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social updates request message from unauthorized peer`
      );
      return;
    }

    // TODO: make sure this user is allowed to see this data
    const query = this.table<SocialPost>("posts").query();
    // let peerDid = message.peer.did;
    if (message.payload.did) {
      query.where("did", "=", message.payload.did);
    } else {
      const peerDid = message.peer.did;
      const connections = await this.table<SocialConnection>("connections")
        .query()
        .where("to", "=", peerDid)
        .or((qb) => qb.where("from", "=", peerDid))
        .nocache()
        .select()
        .execute()
        .then((result) => result.all());
      console.info(
        `plugin/social/client > connections for ${peerDid}`,
        connections
      );
      const connectionDids: string[] = [
        ...new Set(
          ...connections.map(
            (c) => (c.from === peerDid ? c.to : c.from) as string
          )
        ),
      ].filter((c) => !!c);
      query.where("did", "in", connectionDids);
    }
    if (message.payload.since) {
      query.where("createdAt", ">=", message.payload.since);
    }
    const posts = await query
      .select()
      .execute()
      .then((result) => result.all());

    console.info(
      `plugin/social/client > sending social updates response message`,
      posts,
      query.instructions
    );

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/posts/fetch/response",
      payload: {
        requestId: message.payload.requestId,
        updates: posts,
      },
    });
  }

  onConnection(
    message: IncomingPubsubMessage<
      SocialServerEvents,
      "/social/connections/create",
      EncodingOptions
    >
  ) {
    console.log("social connection", message);
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
      console.warn(
        `plugin/social/server > received social announce message without peer did`
      );
      return;
    }
    if (!message.payload.address) {
      console.warn(
        `plugin/social/server > received social announce message without peer address`
      );
      return;
    }
    if (!message.payload.addressVerification) {
      console.warn(
        `plugin/social/server > received social announce message without peer address verification`
      );
      return;
    }

    const verified = await checkAddressVerification(
      "candor.social",
      message.peer.did,
      message.payload.address,
      message.payload.addressVerification
    );
    if (!verified) {
      console.warn(
        `plugin/social/server > received social announce message with invalid peer address verification`
      );
      return;
    }

    console.info(
      `plugin/social/server > received peer announce message (did: ${message.peer.did})`,
      message?.payload
    );
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
      name: message.payload.name,
      bio: message.payload.bio,
      status: message.payload.status,
      avatar: message.payload.avatar,
      did: message.peer.did,
      updatedAt: message.payload.updatedAt,
    });
  }

  onPeerConnection(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/connections/create"
    >
  ) {
    console.log("peer connection", message);
  }

  async onUserSearchRequest(
    message: IncomingP2PMessage<
      SocialServerEvents,
      "/social/users/search/request",
      EncodingOptions
    >
  ) {
    console.info(
      `plugin/social/server > received user search request: ${message.payload.query}`
    );
    const table = this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users");

    if (!table) {
      console.warn(`plugin/social/server > users table not found`);
      return;
    }

    const results = ((await table.search(message.payload.query, 20)) ||
      []) as SocialUser[];
    console.info(
      `plugin/social/server > found ${results.length} matches (index: ${table.currentIndex})`
    );

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
    console.info(
      `plugin/social/server > received user get request: ${message.payload.did}`
    );
    const table = this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users");

    if (!table) {
      console.warn(`plugin/social/server > users table not found`);
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
      console.warn(`plugin/social/server > user_pins table not found`);
      return;
    }

    if (!message.peer.did) {
      console.warn(
        `plugin/social/server > received social pin request message without peer did`
      );
      return;
    }

    const existing = await table
      .query()
      .where("did", "=", message.peer.did)
      .where("cid", "=", message.payload.cid)
      .or((qb) =>
        qb
          .where("did", "=", message.peer.did as string)
          .where("textId", "=", message.payload.textId as string)
      )
      .select()
      .execute()
      .then((r) => r.first());

    if (existing) {
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
  }

  async saveUser(did: string, user: Omit<SocialUser, "id">) {
    console.info(`plugin/social/server > saving user (did: ${did})`, user);

    const table = await this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users");

    if (!table) {
      console.warn(`plugin/social/server > users table not found`);
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
