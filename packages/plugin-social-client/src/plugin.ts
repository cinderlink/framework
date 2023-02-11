import type {
  PluginInterface,
  CandorClientInterface,
  PubsubMessage,
  Peer,
  P2PMessage,
} from "@candor/core-types";
import Emittery from "emittery";
import { v4 as uuid } from "uuid";
import { SocialClientEvents } from "./types";
import type {
  SocialAnnounceMessage,
  SocialUpdatesRequestMessage,
  SocialUpdatesResponseMessage,
  SocialConnectionMessage,
  SocialUpdateMessage,
  SocialClientPluginEvents,
  SocialConnectionRecord,
  SocialPost,
  SocialUser,
  SocialProfile,
  SocialUserStatus,
  SocialUserSearchResponseMessage,
} from "@candor/plugin-social-core";
import { loadSocialSchema } from "@candor/plugin-social-core";
import { multiaddr } from "@multiformats/multiaddr";

export class SocialClientPlugin
  extends Emittery<SocialClientPluginEvents>
  implements PluginInterface<SocialClientEvents>
{
  id = "socialClient";
  name = "guest";
  bio = "";
  avatar = "";
  status: SocialUserStatus = "online";
  updatedAt = Date.now();
  interval: NodeJS.Timer | null = null;
  ready = false;

  maxConnectionCount = 24;

  pubsub = {
    "/social/announce": this.onSocialAnnounce,
    "/social/connection": this.onSocialConnection,
    "/social/update": this.onSocialUpdate,
  };

  p2p = {
    "/social/announce": this.onSocialAnnounce,
    "/social/connection": this.onSocialConnection,
    "/social/update": this.onSocialUpdate,
    "/social/updates/request": this.onSocialUpdatesRequest,
    "/social/updates/response": this.onSocialUpdatesResponse,
    "/social/users/search/response": this.onUsersSearchResponse,
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
    let hasPublished = false;

    console.info(`plugin/social/client > loading schema`);
    await loadSocialSchema(this.client);

    this.client.on("/peer/connect", async (peer: Peer) => {
      console.info(
        `plugin/social/client > announcing (new peer: ${peer.peerId})`
      );
      if (!hasPublished) {
        hasPublished = true;
        console.info(`plugin/social/client > announcing (pubsub, initial)`);
        await this.client.publish(
          "/social/announce",
          {
            requestId: uuid(),
            name: this.name,
            avatar: this.avatar,
            bio: this.bio,
            status: this.status,
            updatedAt: this.updatedAt,
          },
          { sign: true }
        );
      } else {
        console.info(`plugin/social/client > announcing (p2p, peer connected)`);
        await this.client.send(peer.peerId.toString(), {
          topic: "/social/announce",
          data: {
            requestId: uuid(),
            name: this.name,
            bio: this.bio,
            status: this.status,
            avatar: this.avatar,
            updatedAt: this.updatedAt,
          },
        });
      }
    });

    this.interval = setInterval(() => {
      if (!hasConnected) return;
      console.info(`plugin/social/client > announcing (pubsub, interval)`);
      this.client.publish(
        "/social/announce",
        {
          requestId: uuid(),
          name: this.name,
          avatar: this.avatar,
          bio: this.bio,
          status: this.status,
          updatedAt: this.updatedAt,
        },
        { sign: true }
      );
    }, Number(this.options.interval || 1000 * 180));

    await this.loadLocalUser();

    this.ready = true;
    console.info(`plugin/social/client > ready`);
    this.emit("ready", undefined);
  }

  async stop() {
    console.info(`plugin/social/client > stopping`);
  }

  async setName(name: string) {
    this.name = name;
    this.updatedAt = Date.now();
    await this.saveLocalUser();
  }

  async setAvatar(avatar: string) {
    this.avatar = avatar;
    this.updatedAt = Date.now();
    await this.saveLocalUser();
  }

  async setBio(bio: string) {
    this.bio = bio;
    this.updatedAt = Date.now();
    await this.saveLocalUser();
  }

  async setStatus(status: SocialUserStatus) {
    this.status = status;
    this.updatedAt = Date.now();
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
    const saved = await table.upsert("cid", cid.toString(), post);

    if (saved === undefined) {
      throw new Error("failed to upsert post");
    }

    return saved as SocialPost;
  }

  async getLocalUser(): Promise<SocialUser | undefined> {
    const schema = this.client.getSchema("social");
    const table = schema?.getTable("users");
    if (!table) {
      console.info("users table not found", { schema, table });
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

    const profile = (
      await table.query().where("userId", "=", userId).select().execute()
    ).first();

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

    const posts = await table
      .query()
      .where("authorId", "=", userId)
      .select()
      .execute();

    return posts.all();
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
    const saved = await table.upsert("userId", this.client.id, profile);

    if (saved === undefined) {
      throw new Error("failed to upsert profile");
    }

    return saved as SocialProfile;
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
    if (!schema) {
      console.error(
        `plugin/social/client > cannot save local user, failed to get schema`
      );
      return;
    }

    const table = schema.getTable("users");
    if (!table) {
      console.error(
        `plugin/social/client > cannot save local user, failed to get users table`
      );
      return;
    }

    console.info(`plugin/social/client > saving local user`);

    const user = await table.upsert("did", this.client.id, localUser);
    // .findByIndex("did", this.client.id);
    if (!user?.id) {
      console.error(
        `plugin/social/client > failed to save local user, user not found after upsert (did: ${this.client.id}))`
      );
      return;
    }

    await this.client.save();
  }

  async loadLocalUser() {
    const user = (
      await this.client
        .getSchema("social")
        ?.getTable("users")
        ?.query()
        .where("did", "=", this.client.id)
        .select()
        .execute()
    )?.first();
    if (user?.name && user?.avatar) {
      this.name = user.name as string;
      this.avatar = user.avatar as string;
      this.bio = user.bio as string;
    }
  }

  async getUserByDID(did: string): Promise<SocialUser | undefined> {
    const schema = this.client.getSchema("social");
    const table = schema?.getTable("users");
    console.info(
      `plugin/social/client > getting user by did: ${did}...`,
      schema,
      table
    );
    return table
      ?.query()
      .where("did", "=", did)
      .select()
      .execute()
      .then((result) => result.first() as SocialUser | undefined);
  }

  async getUser(userId: number): Promise<SocialUser | undefined> {
    return this.client
      .getSchema("social")
      ?.getTable("users")
      ?.query()
      .where("id", "=", userId)
      .select()
      .execute()
      .then((result) => result.first() as SocialUser | undefined);
  }

  async onSocialConnection(
    message:
      | PubsubMessage<SocialConnectionMessage>
      | P2PMessage<string, SocialConnectionMessage>
  ) {
    if (!message.peer?.did) {
      console.warn(
        `plugin/social/client > failed to create connection from unknown peer`,
        message
      );
      return;
    }

    const fromUserId = (await this.getUserByDID(message.peer.did))?.id;
    if (!fromUserId || message.data.from !== message.peer.did) {
      console.warn(
        `plugin/social/client > failed to create connection from unknown user`,
        {
          fromUserId,
          from: message.data.from,
          did: message.peer.did,
        }
      );
      return;
    }

    const localUserId = await this.getLocalUserId();
    if (!localUserId || message.data.to !== this.client.id) {
      console.warn(
        `plugin/social/client > failed to create connection to unknown user (local)`,
        {
          localUserId,
          to: message.data.to,
          did: this.client.id,
        }
      );
      return;
    }

    const connectionsTable = await this.client
      .getSchema("social")
      ?.getTable<SocialConnectionRecord>("connections");

    const connection = await connectionsTable
      ?.query()
      .select()
      .where("fromId", "=", fromUserId)
      .where("toId", "=", localUserId)
      .execute()
      .then((result) => result.first() as SocialConnectionRecord | undefined);
    if (connection?.id) {
      await connectionsTable?.update(connection.id, {
        follow: message.data.follow,
      });
    } else {
      await connectionsTable?.insert({
        fromId: fromUserId,
        toId: localUserId,
        follow: message.data.follow,
      });
    }
  }

  async onSocialAnnounce(
    message:
      | PubsubMessage<SocialAnnounceMessage>
      | P2PMessage<string, SocialAnnounceMessage>
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social announce message from unauthenticated peer (peerId: ${message.peer.peerId})`
      );
      return;
    }

    console.info(
      `plugin/social/client > received social announce message (did: ${message.peer.did})`,
      message.data
    );
    await this.client
      .getSchema("social")
      ?.getTable("users")
      ?.upsert("did", message.peer.did, {
        name: message.data.name,
        bio: message.data.bio,
        status: message.data.status,
        avatar: message.data.avatar,
        did: message.peer.did,
        updatedAt: message.data.updatedAt,
      });

    try {
      const peers = this.client.ipfs.libp2p.getPeers() || [];
      if (
        peers.length < this.maxConnectionCount &&
        !peers
          .map((p) => p.toString())
          ?.includes(message.peer.peerId.toString())
      ) {
        const addr = await this.client.ipfs.libp2p.peerStore.addressBook.get(
          message.peer.peerId
        );
        if (addr[0]) {
          console.warn(
            `plugin/social/client > discovered peer ${message.peer.peerId} (address: ${addr[0].multiaddr})`
          );
          await this.client.ipfs.swarm.connect(addr[0].multiaddr);
        } else {
          const relayAddr = `${this.client.relayAddresses[0]}/p2p-circuit/p2p/${message.peer.peerId}`;
          console.warn(
            `plugin/social/client > discovered peer ${message.peer.peerId} without address, attempting relay (relay: ${relayAddr})`
          );
          await this.client.ipfs.swarm.connect(multiaddr(relayAddr));
        }
        await this.client.connect(message.peer.peerId);
      }
    } catch (e) {
      console.warn(
        `plugin/social/client > failed to connect to peer ${message.peer.peerId}`,
        e
      );
    }
  }

  async onSocialUpdate(
    message:
      | PubsubMessage<SocialUpdateMessage>
      | P2PMessage<string, SocialUpdateMessage>
  ) {
    const { post } = message.data;
    if (!post) return;

    const cid = await this.client.dag.store(post);
    // TODO: pin & add to user_pins
    if (!cid) {
      console.warn(
        `plugin/social/client > failed to store social update message (did: ${message.peer.did})`
      );
      return;
    }

    await this.client
      .getSchema("social")
      ?.getTable("posts")
      ?.upsert("cid", cid.toString(), {
        ...post,
        cid,
        did: message.peer.did,
      });
  }

  async onSocialUpdatesRequest(
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

    const fromUserId = (await this.getUserByDID(message.peer.did))?.id;
    if (!fromUserId) {
      console.warn(
        `plugin/social/client > received social updates request message from unknown user`
      );
      return;
    }
    // TODO: make sure this user is allowed to see this data
    const myPosts = await this.client
      .getSchema("social")
      ?.getTable<SocialPost>("posts")
      ?.query()
      .where("authorId", "=", fromUserId)
      .execute()
      .then((result) => result.all());
    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/updates/response",
      data: {
        requestId: message.data.requestId,
        updates: myPosts?.map((post) => post) || [],
      },
    });
  }

  onSocialUpdatesResponse(
    message:
      | PubsubMessage<SocialUpdatesResponseMessage>
      | P2PMessage<string, SocialUpdatesResponseMessage>
  ) {}

  async sendSocialConnection(to: string, follow: boolean) {
    const message: SocialConnectionMessage = {
      from: this.client.id,
      to,
      follow,
      requestId: uuid(),
    };
    await this.client.publish("/social/connection", message, {
      sign: true,
    });
  }

  async onUsersSearchResponse(
    message: P2PMessage<string, SocialUserSearchResponseMessage>
  ) {
    const { requestId } = message.data;
    console.info(
      `plugin/social/client > received users search response (requestId: ${requestId})`
    );
    this.emit(
      `/search/users/${requestId}` as keyof SocialClientPluginEvents,
      message.data
    );
  }
}

export default SocialClientPlugin;
