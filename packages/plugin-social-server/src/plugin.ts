import {
  loadSocialSchema,
  SocialPost,
  SocialUpdateMessage,
  SocialUpdatesRequestMessage,
  SocialUpdatesResponseMessage,
  SocialUser,
  SocialUserGetRequestMessage,
  SocialUserGetResponseMessage,
} from "@candor/plugin-social-core";
import type {
  PluginInterface,
  CandorClientInterface,
  PubsubMessage,
  P2PMessage,
  TableRow,
  TableDefinition,
} from "@candor/core-types";
import type {
  SocialConnectionMessage,
  SocialAnnounceMessage,
} from "@candor/plugin-social-core";
import { SocialClientEvents } from "@candor/plugin-social-client";
import {
  SocialUserSearchRequestMessage,
  SocialUserSearchResponseMessage,
} from "@candor/plugin-social-core/src";

export type SocialServerEvents = {
  publish: {};
  subscribe: SocialClientEvents["subscribe"];
  send: {
    "/social/users/search/response": SocialUserSearchResponseMessage;
    "/social/user/get/response": SocialUserGetResponseMessage;
    "/social/updates/response": SocialUpdatesResponseMessage;
  };
  receive: {
    "/social/updates/request": SocialUpdatesRequestMessage;
    "/social/users/search/request": SocialUserSearchRequestMessage;
    "/social/user/get/request": SocialUserGetRequestMessage;
  };
  emit: {};
};

export class SocialServerPlugin implements PluginInterface<SocialServerEvents> {
  id = "socialServer";
  constructor(
    public client: CandorClientInterface<SocialServerEvents>,
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
    "/social/announce": this.onPeerAnnounce,
    "/social/connection": this.onPeerConnection,
    "/social/users/search/request": this.onUserSearchRequest,
    "/social/user/get/request": this.onUserGetRequest,
    "/social/updates/request": this.onUpdatesRequest,
  };
  pubsub = {
    "/social/update": this.onUpdate,
    "/social/announce": this.onAnnounce,
    "/social/connection": this.onConnection,
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

  onAnnounce(message: PubsubMessage<SocialAnnounceMessage>) {
    if (this.client.hasPlugin("socialClient")) return;
    console.info(
      `plugin/social/server > received pubsub announce message (did: ${message.peer.did})`,
      message?.data
    );
    return this.saveUser(message.peer.did, {
      name: message.data.name,
      bio: message.data.bio,
      status: message.data.status,
      avatar: message.data.avatar,
      did: message.peer.did,
      updatedAt: message.data.updatedAt,
    });
  }

  async onUpdate(
    message:
      | PubsubMessage<SocialUpdateMessage>
      | P2PMessage<string, SocialUpdateMessage>
  ) {
    const { id, ...post } = message.data as any;
    if (!post?.id) return;

    const cid = await this.client.dag.store(post);
    // TODO: pin & add to user_pins
    if (!cid) {
      console.warn(
        `plugin/social/client > failed to store social update message (did: ${message.peer.did})`
      );
      return;
    }

    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social update message from unauthorized peer`
      );
      return;
    }

    const authorId = (await this.getUserByDID(message.peer.did))?.id;
    if (!authorId) {
      console.warn(
        `plugin/social/client > received social update message from unknown user`
      );
      return;
    }

    console.info(`plugin/social/client > storing social update message`, {
      ...post,
      authorId,
    });
    await this.table<SocialPost>("posts").upsert("cid", cid.toString(), {
      ...post,
      authorId,
    });
  }

  async onUpdatesRequest(
    message:
      | PubsubMessage<SocialUpdatesRequestMessage>
      | P2PMessage<string, SocialUpdatesRequestMessage>
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social updates request message from unauthorized peer`
      );
      return;
    }

    const authorId = (await this.getUserByDID(message.data.author))?.id;
    if (!authorId) {
      console.warn(
        `plugin/social/client > received social updates request message from unknown user`
      );
      return;
    }
    // TODO: make sure this user is allowed to see this data
    const posts = await this.table<SocialPost>("posts")
      .query()
      .where("authorId", "=", authorId)
      .select()
      .execute()
      .then((result) => result.all());
    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/updates/response",
      data: {
        requestId: message.data.requestId,
        updates: posts,
      },
    });
  }

  onConnection(message: PubsubMessage<SocialConnectionMessage>) {
    console.log("social connection", message);
  }

  onPeerAnnounce(message: P2PMessage<string, SocialAnnounceMessage>) {
    if (this.client.hasPlugin("socialClient")) return;
    if (!message.peer.did) {
      console.warn(
        `plugin/social/server > received social announce message without peer did`
      );
      return;
    }
    console.info(
      `plugin/social/server > received peer announce message (did: ${message.peer.did})`,
      message?.data
    );
    return this.saveUser(message.peer.did, {
      name: message.data.name,
      bio: message.data.bio,
      status: message.data.status,
      avatar: message.data.avatar,
      did: message.peer.did,
      updatedAt: message.data.updatedAt,
    });
  }

  onPeerConnection(message: P2PMessage<string, SocialConnectionMessage>) {
    console.log("peer connection", message);
  }

  async onUserSearchRequest(
    message: P2PMessage<string, SocialUserSearchRequestMessage>
  ) {
    console.info(
      `plugin/social/server > received user search request: ${message.data.query}`
    );
    const table = this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users");

    if (!table) {
      console.warn(`plugin/social/server > users table not found`);
      return;
    }

    const results = ((await table.search(message.data.query, 20)) ||
      []) as SocialUser[];
    console.info(
      `plugin/social/server > found ${results.length} matches (index: ${table.currentIndex})`
    );

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/users/search/response",
      data: {
        requestId: message.data.requestId,
        results,
      },
    });
  }

  async onUserGetRequest(
    message: P2PMessage<string, SocialUserGetRequestMessage>
  ) {
    console.info(
      `plugin/social/server > received user get request: ${message.data.did}`
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
      .where("did", "=", message.data.did)
      .select()
      .execute()
      .then((r) => r.first());

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/user/get/response",
      data: {
        requestId: message.data.requestId,
        user,
      },
    });
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

    await table?.upsert("did", did, user);
  }
}

export default SocialServerPlugin;
