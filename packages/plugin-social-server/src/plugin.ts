import {
  loadSocialSchema,
  SocialUser,
  SocialUserGetRequestMessage,
  SocialUserGetResponseMessage,
} from "@candor/plugin-social-core";
import type {
  PluginInterface,
  CandorClientInterface,
  PubsubMessage,
  P2PMessage,
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
  };
  receive: {
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
  };
  pubsub = {
    "/social/announce": this.onSocialAnnounce,
    "/social/connection": this.onSocialConnection,
  };
  events = {};

  onSocialAnnounce(message: PubsubMessage<SocialAnnounceMessage>) {
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

  onSocialConnection(message: PubsubMessage<SocialConnectionMessage>) {
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
