import type {
  PluginInterface,
  CandorClientInterface,
  PubsubMessage,
} from "@candor/core-types";
import { Schema } from "@candor/ipld-database";
import { v4 as uuid } from "uuid";
import { CID } from "multiformats";
import {
  SocialAnnounceMessage,
  SocialUpdatesRequestMessage,
  SocialUpdatesResponseMessage,
  SocialClientEvents,
  SocialConnectionMessage,
  SocialUpdateMessage,
} from "./types";

export type SocialConnectionRecord = {
  id?: number;
  from: string;
  to: string;
  follow: boolean;
};

export type SocialUser = {
  id?: number;
  name: string;
  avatar: string;
  did: string;
};

export type SocialPost = {
  cid: string;
  did: string;
  createdAt: number;
};

export class SocialClientPlugin implements PluginInterface<SocialClientEvents> {
  id = "socialClient";
  name = "guest";
  avatar = "";
  interval: NodeJS.Timer | null = null;

  constructor(
    public client: CandorClientInterface<SocialClientEvents>,
    public options: Record<string, unknown> = {}
  ) {}

  async start() {
    let hasConnected = false;
    console.info("social client plugin started", this.client.schemas);
    // TODO: find a way to make this more dynamic
    if (!this.client.schemas["social"]) {
      console.info("adding social schema");
      const schema = new Schema(
        "social",
        {
          users: {
            encrypted: false,
            aggregate: {},
            indexes: ["name", "did"],
            rollup: 1000,
            searchOptions: {
              fields: ["name", "did"],
            },
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                avatar: { type: "string" },
                did: { type: "string" },
              },
            },
          },
          connections: {
            encrypted: true,
            aggregate: {},
            indexes: ["from", "to"],
            rollup: 1000,
            searchOptions: {
              fields: ["from", "to"],
            },
            schema: {
              type: "object",
              properties: {
                from: { type: "string" },
                to: { type: "string" },
                follow: { type: "boolean" },
              },
            },
          },
          posts: {
            encrypted: true,
            aggregate: {},
            indexes: ["did", "cid"],
            rollup: 1000,
            searchOptions: {
              fields: ["did", "cid", "title", "content", "tags", "comments"],
            },
            schema: {
              type: "object",
              properties: {
                did: { type: "string" },
                cid: { type: "string" },
                title: { type: "string" },
                content: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                comments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      did: { type: "string" },
                      cid: { type: "string" },
                      content: { type: "string" },
                      at: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        this.client.dag
      );
      await this.client.addSchema("social", schema);
    }
    this.client.on("/peer/connect", () => {
      if (!hasConnected) {
        hasConnected = true;
        setTimeout(() => {
          this.client.publish("/social/announce", {
            requestID: uuid(),
            name: this.name,
            avatar: this.avatar,
          });
        }, 3000);
      }
    });
    // this.interval = setInterval(() => {
    //   if (!hasConnected) return;
    //   this.client.publish("/social/announce", {
    //     requestID: uuid(),
    //     name: this.name,
    //     avatar: this.avatar,
    //   });
    // }, Number(this.options.interval || 1000 * 15));

    await this.loadLocalUser();
  }

  async stop() {
    console.info("social client plugin stopped");
  }

  async setName(name: string) {
    this.name = name;
    await this.saveLocalUser();
  }

  async setAvatar(avatar: string) {
    this.avatar = avatar;
    await this.saveLocalUser();
  }

  async setState({ name, avatar }: { name: string; avatar: string }) {
    this.name = name;
    this.avatar = avatar;
    await this.saveLocalUser();
  }

  async saveLocalUser() {
    console.info("saving local user", this.name, this.avatar, this.client.id);
    await this.client
      .getSchema("social")
      ?.getTable("users")
      ?.upsert("did", this.client.id, {
        name: this.name || "(guest)",
        avatar: this.avatar || "",
        did: this.client.id,
      });

    const user = await this.client
      .getSchema("social")
      ?.getTable("users")
      ?.findByIndex("did", this.client.id);
    console.info("saved local user", user);
  }

  async loadLocalUser() {
    const user = await this.client
      .getSchema("social")
      ?.getTable("users")
      ?.findByIndex("did", this.client.id);
    if (user?.name && user?.avatar) {
      this.name = user.name as string;
      this.avatar = user.avatar as string;
    }
  }

  pubsub = {
    "/social/announce": this.onSocialAnnounce,
    "/social/connection": this.onSocialConnection,
    "/social/update": this.onSocialUpdate,
  };
  p2p = {
    "/social/updates/request": this.onSocialUpdatesRequest,
    "/social/updates/response": this.onSocialUpdatesResponse,
  };
  events = {};

  async onSocialConnection(message: PubsubMessage<SocialConnectionMessage>) {
    const connection = await this.client
      .getSchema("social")
      ?.getTable<SocialConnectionRecord>("connections")
      ?.find((connection: SocialConnectionRecord) => {
        if (
          connection.to === message.data.to &&
          connection.from === message.peer.did
        ) {
          return true;
        }
        return false;
      });
    if (connection?.id) {
      await this.client
        .getSchema("social")
        ?.getTable<SocialConnectionRecord>("connections")
        ?.update(connection.id, {
          follow: message.data.follow,
        });
    } else {
      await this.client
        .getSchema("social")
        ?.getTable<SocialConnectionRecord>("connections")
        ?.insert({
          from: message.peer.did,
          to: message.data.to,
          follow: message.data.follow,
        });
    }
  }

  async onSocialAnnounce(message: PubsubMessage<SocialAnnounceMessage>) {
    console.info("social announce", message);
    await this.client
      .getSchema("social")
      ?.getTable("users")
      ?.upsert("did", message.peer.did, {
        name: message.data.name,
        avatar: message.data.avatar,
        did: message.peer.did,
      });
  }

  async onSocialUpdate(message: PubsubMessage<SocialUpdateMessage>) {
    const { cid } = message.data;
    const post = await this.client.dag.load(CID.parse(cid));
    if (!post) return;
    await this.client
      .getSchema("social")
      ?.getTable("posts")
      ?.upsert("cid", cid, {
        ...post,
        cid,
        did: message.peer.did,
      });
  }

  async onSocialUpdatesRequest(
    message: PubsubMessage<SocialUpdatesRequestMessage>
  ) {
    // TODO: make sure this user is allowed to see this data
    const myPosts = await this.client
      .getSchema("social")
      ?.getTable<SocialPost>("posts")
      ?.where((post) => {
        if (post.did === message.peer.did) {
          return true;
        }
        return false;
      });
    await this.client.send(message.peer.did, {
      topic: "/social/updates/response",
      requestID: message.data.requestID,
      updates: myPosts?.map((post) => ({
        cid: post.cid,
      })),
    });
  }

  onSocialUpdatesResponse(
    message: PubsubMessage<SocialUpdatesResponseMessage>
  ) {}

  async sendSocialConnection(to: string, follow: boolean) {
    const message: SocialConnectionMessage = { to, follow, requestID: uuid() };
    await this.client.publish("/social/connection", message);
  }
}

export default SocialClientPlugin;
