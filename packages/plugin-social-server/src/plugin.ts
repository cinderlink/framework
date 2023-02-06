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

  onPeerAnnounce(message: P2PMessage<SocialAnnounceMessage>) {
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

  onPeerConnection(message: P2PMessage<SocialConnectionMessage>) {
    console.log("peer connection", message);
  }

  async onUserSearchRequest(
    message: P2PMessage<SocialUserSearchRequestMessage>
  ) {
    console.info(
      `plugin/social/server > received user search request: ${message.data.query}`
    );
    const matches =
      (await this.client
        .getSchema("social")
        ?.getTable("users")
        ?.search(message.data.query, 20)) || ([] as SocialUser[]);
    console.info(`plugin/social/server > found ${matches.length} matches`);

    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/users/search/response",
      data: {
        query: message.data.query,
        matches,
      },
    });
  }

  async saveUser(did: string, user: SocialUser) {
    console.info(
      `plugin/social/client > received social announce message (did: ${did})`
    );
    await this.client
      .getSchema("social")
      ?.getTable("users")
      ?.upsert("did", did, user);
  }
}

export default SocialServerPlugin;
