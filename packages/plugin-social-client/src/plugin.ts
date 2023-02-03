import type {
  PluginInterface,
  CandorClientInterface,
  PubsubMessage,
} from "@candor/core-types";
import Emittery from "emittery";
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
  SocialClientPluginEvents,
  SocialConnectionRecord,
  SocialPost,
  SocialUser,
  SocialProfile,
} from "./types";
import { SocialSchemaDef } from "./schema";

export class SocialClientPlugin
  extends Emittery<SocialClientPluginEvents>
  implements PluginInterface<SocialClientEvents>
{
  id = "socialClient";
  name = "guest";
  bio = "";
  avatar = "";
  interval: NodeJS.Timer | null = null;
  ready = false;

  pubsub = {
    "/social/announce": this.onSocialAnnounce,
    "/social/connection": this.onSocialConnection,
    "/social/update": this.onSocialUpdate,
  };
  p2p = {
    "/social/updates/request": this.onSocialUpdatesRequest,
    "/social/updates/response": this.onSocialUpdatesResponse,
  };

  constructor(
    public client: CandorClientInterface<SocialClientEvents>,
    public options: Record<string, unknown> = {}
  ) {
    super();
    // this.client.publish();
  }

  async start() {
    let hasConnected = false;
    console.info("social client plugin started", this.client.schemas);
    // TODO: find a way to make this more dynamic
    if (!this.client.schemas["social"]) {
      console.info("adding social schema");
      const schema = new Schema("social", SocialSchemaDef, this.client.dag);
      await this.client.addSchema("social", schema);
    } else {
      this.client.schemas["social"].setDefs(SocialSchemaDef);
    }
    this.client.on("/peer/connect", () => {
      if (!hasConnected) {
        hasConnected = true;
        setTimeout(() => {
          console.info("peer connected, announcing social presence");
          this.client.publish("/social/announce", {
            requestId: uuid(),
            name: this.name,
            avatar: this.avatar,
          });
        }, 3000);
      }
    });

    this.interval = setInterval(() => {
      if (!hasConnected) return;
      console.info("[interval] announcing social presence");
      this.client.publish("/social/announce", {
        requestId: uuid(),
        name: this.name,
        avatar: this.avatar,
      });
    }, Number(this.options.interval || 1000 * 180));

    await this.loadLocalUser();
    console.info("social client plugin ready");
    this.ready = true;
    this.emit("ready", undefined);
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

  async setBio(bio: string) {
    this.bio = bio;
    await this.saveLocalUser();
  }

  async createPost(
    postData: Omit<Omit<Omit<SocialPost, "cid">, "id">, "authorId">
  ): Promise<SocialPost> {
    const authorId = await this.getLocalUserId();
    if (authorId === undefined) {
      throw new Error("failed to get local user id");
    }

    const schema = this.client.getSchema("social");
    const table = schema?.getTable("posts");
    if (!table) {
      throw new Error("failed to get posts table");
    }

    const cid = await this.client.dag.store({ ...postData, authorId });
    if (!cid) {
      throw new Error("failed to store post");
    }

    const post = { ...postData, authorId, cid: cid.toString() };
    const postId = await table.upsert("cid", cid.toString(), post);

    if (postId === undefined) {
      throw new Error("failed to upsert post");
    }

    return { ...post, id: postId };
  }

  async getLocalUser(): Promise<SocialUser | undefined> {
    const schema = this.client.getSchema("social");
    const table = schema?.getTable("users");
    if (!table) {
      throw new Error("failed to get users table");
    }

    return this.getUserByDID(this.client.id);
  }

  async getLocalUserId(): Promise<number | undefined> {
    const user = await this.getLocalUser();
    return user?.id;
  }

  async getUserProfile(userId: number): Promise<SocialProfile | undefined> {
    const schema = this.client.getSchema("social");
    const table = schema?.getTable<SocialProfile>("profiles");
    if (!table) {
      throw new Error("failed to get profiles table");
    }

    const profile = await table.find((row) => row.userId === userId);

    return profile;
  }

  async getLocalProfile(): Promise<SocialProfile | undefined> {
    const localUserId = await this.getLocalUserId();
    if (localUserId === undefined) {
      throw new Error("failed to get local user id");
    }

    return this.getUserProfile(localUserId);
  }

  async getUserPosts(userId: number): Promise<SocialPost[]> {
    const schema = this.client.getSchema("social");
    const table = schema?.getTable<SocialPost>("posts");
    if (!table) {
      throw new Error("failed to get posts table");
    }

    const posts = await table.where((row) => row.authorId === userId);

    return posts;
  }

  async getLocalUserPosts(): Promise<SocialPost[]> {
    const localUserId = await this.getLocalUserId();
    if (localUserId === undefined) {
      throw new Error("failed to get local user id");
    }

    return this.getUserPosts(localUserId);
  }

  async createProfile(
    profileData: Omit<Omit<SocialProfile, "id">, "userId">
  ): Promise<SocialProfile> {
    const localUserId = await this.getLocalUserId();
    if (localUserId === undefined) {
      throw new Error("failed to get local user id");
    }

    const schema = this.client.getSchema("social");
    const table = schema?.getTable("profiles");
    if (!table) {
      throw new Error("failed to get profiles table");
    }

    const profile = { ...profileData, userId: localUserId };
    const profileId = await table.upsert("userId", this.client.id, profile);

    if (profileId === undefined) {
      throw new Error("failed to upsert profile");
    }

    return { ...profile, id: profileId };
  }

  async setState({
    name,
    avatar,
    bio,
  }: {
    name?: string;
    avatar?: string;
    bio?: string;
  }) {
    this.name = name || this.name;
    this.avatar = avatar || this.avatar;
    this.bio = bio || this.bio;
    await this.saveLocalUser();
  }

  async saveLocalUser() {
    const localUser = {
      name: this.name || "(guest)",
      avatar: this.avatar || "",
      did: this.client.id,
    };
    const schema = this.client.getSchema("social");
    console.info("saving local user", localUser);
    await this.client
      .getSchema("social")
      ?.getTable("users")
      ?.upsert("did", this.client.id, localUser);

    const user = await this.client
      .getSchema("social")
      ?.getTable("users")
      ?.findByIndex("did", this.client.id);
    console.info("saved local user", user, localUser);

    await this.client.save();
  }

  async loadLocalUser() {
    const user = await this.client
      .getSchema("social")
      ?.getTable("users")
      ?.findByIndex("did", this.client.id);
    if (user?.name && user?.avatar) {
      this.name = user.name as string;
      this.avatar = user.avatar as string;
      this.bio = user.bio as string;
    }
  }

  async getUserByDID(did: string): Promise<SocialUser | undefined> {
    return this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users")
      ?.findByIndex("did", did);
  }

  async getUser(userId: number): Promise<SocialUser | undefined> {
    return this.client
      .getSchema("social")
      ?.getTable<SocialUser>("users")
      ?.find((user: SocialUser) => user.id === userId);
  }

  async onSocialConnection(message: PubsubMessage<SocialConnectionMessage>) {
    const fromUserId = (await this.getUserByDID(message.data.from))?.id;
    if (!fromUserId || message.data.from !== message.from) {
      console.warn("failed to create connection from unknown user");
      return;
    }

    const localUserId = await this.getLocalUserId();
    if (!localUserId || message.data.to !== this.client.id) {
      console.warn("failed to create connection to unknown user");
      return;
    }

    const connection = await this.client
      .getSchema("social")
      ?.getTable<SocialConnectionRecord>("connections")
      ?.find((connection: SocialConnectionRecord) => {
        if (
          connection.toId === localUserId &&
          connection.fromId === fromUserId
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
          fromId: fromUserId,
          toId: localUserId,
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
    const fromUserId = (await this.getUserByDID(message.from))?.id;
    // TODO: make sure this user is allowed to see this data
    const myPosts = await this.client
      .getSchema("social")
      ?.getTable<SocialPost>("posts")
      ?.where((post) => {
        if (post.authorId === fromUserId) {
          return true;
        }
        return false;
      });
    await this.client.send(message.peer.did, {
      topic: "/social/updates/response",
      requestId: message.data.requestId,
      updates: myPosts?.map((post) => post.id),
    });
  }

  onSocialUpdatesResponse(
    message: PubsubMessage<SocialUpdatesResponseMessage>
  ) {}

  async sendSocialConnection(to: string, follow: boolean) {
    const message: SocialConnectionMessage = {
      from: this.client.id,
      to,
      follow,
      requestId: uuid(),
    };
    await this.client.publish("/social/connection", message);
  }
}

export default SocialClientPlugin;
