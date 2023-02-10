import { loadSocialSchema, SocialUser } from "@candor/plugin-social-core";
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
  };
  receive: {
    "/social/users/search/request": SocialUserSearchRequestMessage;
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
  };
  pubsub = {
    "/social/announce": this.onSocialAnnounce,
    "/social/connection": this.onSocialConnection,
  };
  events = {};

  onSocialAnnounce(message: PubsubMessage<SocialAnnounceMessage>) {
    console.info(
      `plugin/social/server > received pubsub announce message (did: ${message.peer.did})`
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
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social announce message without peer did`
      );
      return;
    }
    console.info(
      `plugin/social/server > received peer announce message (did: ${message.peer.did})`
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

    const results = await table.where((row) => {
      return (
        row.name?.indexOf(message.data.query) > -1 ||
        row.bio?.indexOf(message.data.query) > -1
      );
    });
    console.info(
      `plugin/social/server > found ${results.length} matches manually (index: ${table.currentIndex})`,
      results
    );

    // const results = ((await table.search(message.data.query, 20)) ||
    //   []) as SocialUser[];
    // console.info(
    //   `plugin/social/server > found ${results.length} matches (index: ${table.currentIndex})`
    // );

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/users/search/response",
      data: {
        requestId: message.data.requestId,
        results,
      },
    });
  }

  async saveUser(did: string, user: SocialUser) {
    console.info(
      `plugin/social/client > received social announce message (did: ${did})`
    );

    const table = await this.client.getSchema("social")?.getTable("users");

    if (!table) {
      console.warn(`plugin/social/server > users table not found`);
      return;
    }

    const existingUser = await table.findByIndex("did", did);
    if (existingUser?.avatar && existingUser.avatar !== user.avatar) {
      // unpin the old avatar CID
      await this.client.ipfs.pin.rm(existingUser.avatar as string);
    }

    // pin the avatar CID
    if (user.avatar) {
      await this.client.ipfs.pin.add(user.avatar);
    }

    await this.client
      .getSchema("social")
      ?.getTable("users")
      ?.upsert("did", did, user);
  }
}

export default SocialServerPlugin;
