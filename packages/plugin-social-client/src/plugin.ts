import { IncomingP2PMessage } from "@candor/core-types/src/p2p";
import type {
  PluginInterface,
  CandorClientInterface,
  Peer,
  TableRow,
  TableDefinition,
  IncomingPubsubMessage,
  EncodingOptions,
} from "@candor/core-types";
import Emittery from "emittery";
import { v4 as uuid } from "uuid";
import { SocialClientEvents } from "./types";
import {
  SocialConnectionMessage,
  SocialConnectionRecord,
  SocialPost,
  SocialUser,
  SocialProfile,
  SocialUserStatus,
  SocialUserSearchResponseMessage,
  SocialUserGetResponseMessage,
  SocialChatMessageOutgoing,
  SocialChatMessageRequest,
  SocialChatMessageRecord,
  SocialConnectionFilter,
  SocialClientPluginEvents,
} from "@candor/plugin-social-core";
import { loadSocialSchema } from "@candor/plugin-social-core";
import { multiaddr } from "@multiformats/multiaddr";
import type { OfflineSyncClientPluginInterface } from "@candor/plugin-offline-sync-core";

export class SocialClientPlugin<
    Client extends CandorClientInterface<any> = CandorClientInterface<SocialClientEvents>
  >
  extends Emittery<SocialClientPluginEvents>
  implements PluginInterface<SocialClientEvents, Client>
{
  id = "socialClient";
  name = "guest";
  bio = "";
  avatar = "";
  status: SocialUserStatus = "online";
  updatedAt = Date.now();
  interval: NodeJS.Timer | null = null;
  ready = false;

  maxConnectionCount = 256;

  pubsub = {
    "/social/announce": this.onAnnounce,
    "/social/connection": this.onConnection,
    "/social/update": this.onUpdate,
  };

  p2p = {
    "/social/announce": this.onAnnounce,
    "/social/connection": this.onConnection,
    "/social/update": this.onUpdate,
    "/social/updates/request": this.onUpdatesRequest,
    "/social/updates/response": this.onUpdatesResponse,
    "/social/users/search/response": this.onResponseMessage,
    "/social/user/get/response": this.onResponseMessage,
    "/social/chat/message/request": this.onChatMessageRequest,
    "/social/chat/message/response": this.onChatMessageResponse,
  };

  constructor(
    public client: Client,
    public options: Record<string, unknown> = {}
  ) {
    super();
    // this.client.publish();
  }

  async start() {
    let hasConnected = false;

    console.info(`plugin/social/client > loading schema`);
    await loadSocialSchema(this.client);

    this.client.on("/peer/connect", async (peer: Peer) => {
      console.info(
        `plugin/social/client > announcing (new peer: ${peer.peerId})`
      );

      if (peer.role === "server") {
        hasConnected = true;
      }
    });

    this.client.pluginEvents.on(
      "/candor/handshake/success",
      async (peer: Peer) => {
        console.info("handshake success, getting updates");
        if (this.name && this.name !== "guest") {
          console.info(`plugin/social/client > announcing (pubsub)`, {
            name: this.name,
            avatar: this.avatar,
            bio: this.bio,
            status: this.status,
          });
          await this.client.send<SocialClientEvents>(peer.peerId.toString(), {
            topic: "/social/announce",
            payload: {
              requestId: uuid(),
              name: this.name,
              bio: this.bio,
              status: this.status,
              avatar: this.avatar,
              updatedAt: this.updatedAt,
            },
          });
        }

        // ask servers for updates
        // since the last saved update + 24 hours
        const since = await this.table<SocialPost>("posts")
          .query()
          .select()
          .orderBy("createdAt", "desc")
          .limit(1)
          .execute()
          .then((posts) =>
            posts.first()?.createdAt
              ? posts.first()?.createdAt - 24 * 60 * 60 * 1000
              : 0
          );

        console.info(
          `plugin/social/client > requesting updates (new peer: ${peer.peerId})`
        );

        await this.client.send<SocialClientEvents>(peer.peerId.toString(), {
          topic: "/social/updates/request",
          payload: {
            requestId: uuid(),
            since,
          },
        });
      }
    );

    this.interval = setInterval(async () => {
      if (!hasConnected || !this.name || this.name === "guest") return;
      console.info(`plugin/social/client > announcing (pubsub, interval)`);
      await this.publishAnnounceMessage();
    }, Number(this.options.interval || 1000 * 60));

    await this.loadLocalUser();

    const peers = this.client.peers.getPeers();
    console.info(
      `plugin/social/client > requesting posts (peers)`,
      peers.length
    );
    for (const peer of peers) {
      // since the last saved update + 24 hours
      const since = await this.table<SocialPost>("posts")
        .query()
        .select()
        .orderBy("createdAt", "desc")
        .limit(1)
        .execute()
        .then((posts) =>
          posts.first()?.createdAt
            ? posts.first()?.createdAt - 24 * 60 * 60 * 1000
            : 0
        );

      console.info(
        `plugin/social/client > requesting updates (peer: ${peer.peerId})`
      );

      await this.client.send<SocialClientEvents>(peer.peerId.toString(), {
        topic: "/social/updates/request",
        payload: {
          requestId: uuid(),
          since,
        },
      });
    }

    this.ready = true;
    console.info(`plugin/social/client > ready`);
    this.emit("ready", undefined);
  }

  async publishAnnounceMessage() {
    if (!this.name || this.name === "guest") return;
    console.info(`plugin/social/client > announcing (pubsub)`, {
      name: this.name,
      avatar: this.avatar,
      bio: this.bio,
      status: this.status,
    });
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
      { sign: true, encrypt: false }
    );
  }

  get db() {
    const schema = this.client.getSchema("social");
    if (!schema) {
      throw new Error(`plugin/social/client > failed to get schema`);
    }
    return schema;
  }

  table<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(name: string) {
    const table = this.db.getTable<Row, Def>(name);
    if (!table) {
      throw new Error(`plugin/social/client > failed to get table ${name}`);
    }
    return table;
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

  async createPost(content: Partial<SocialPost>): Promise<SocialPost> {
    const { id, did, ...post } = content;
    const cid = await this.client.dag.store(post);
    if (!cid) {
      throw new Error("failed to store post");
    }

    const save = { ...post, cid: cid.toString() };
    const saved = await this.table<SocialPost>("posts").upsert(
      "cid",
      cid.toString(),
      {
        ...save,
        did: this.client.id,
      }
    );

    if (saved === undefined) {
      throw new Error("failed to upsert post");
    }

    // publish the post
    console.info(`plugin/social/client > publishing post`, { post: saved });
    await this.client.publish(
      "/social/update",
      {
        requestId: uuid(),
        post: saved,
      },
      { sign: true, encrypt: false }
    );

    return saved as SocialPost;
  }

  async getLocalUser(): Promise<SocialUser | undefined> {
    return this.getUserByDID(this.client.id);
  }

  async getLocalUserId(): Promise<number | undefined> {
    const user = await this.getLocalUser();
    return user?.id;
  }

  async getUserProfile(userId: number): Promise<SocialProfile | undefined> {
    const profile = (
      await this.table<SocialProfile>("profiles")
        .query()
        .where("userId", "=", userId)
        .select()
        .execute()
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

  async getUserPosts(did: string): Promise<SocialPost[]> {
    const posts = await this.table<SocialPost>("posts")
      .query()
      .where("did", "=", did)
      .select()
      .execute();

    return posts.all();
  }

  async getLocalUserPosts(): Promise<SocialPost[]> {
    return this.getUserPosts(this.client.id);
  }

  async createProfile(
    profileData: Omit<Omit<SocialProfile, "id">, "userId">
  ): Promise<SocialProfile> {
    const localUserId = await this.getLocalUserId();
    if (localUserId === undefined) {
      throw new Error("failed to get local user id");
    }

    const profile = { ...profileData, userId: localUserId };
    const saved = await this.table<SocialProfile>("profiles").upsert(
      "userId",
      localUserId,
      profile
    );

    if (saved === undefined) {
      throw new Error("failed to upsert profile");
    }

    return saved as SocialProfile;
  }

  async searchUsers(query: string) {
    // TODO: add method to send to all servers & aggregate unique responses
    const requestId: string = uuid();
    const server = this.client.peers.getServers()[0];
    if (!server) {
      throw new Error("No servers found");
    }

    await this.client.send(server.peerId.toString(), {
      topic: "/social/users/search/request",
      payload: {
        requestId,
        query,
      },
    });
    console.info({ requestId, query });

    const message = await this.once(
      `/response/${requestId}` as keyof SocialClientPluginEvents
    );
    if (!message) {
      throw new Error(
        `No response received from server (${server.peerId.toString()})`
      );
    }

    return ((message as SocialUserSearchResponseMessage).results ||
      []) as SocialUser[];
  }

  async getUserFromServer(did: string, server?: Peer) {
    const requestId: string = uuid();
    if (!server) {
      server = this.client.peers.getServers()[0];
    }

    if (!server) {
      throw new Error("No servers found");
    }

    await this.client.send(server.peerId.toString(), {
      topic: "/social/user/get/request",
      payload: {
        requestId,
        did,
      },
    });

    const message = await this.once(
      `/response/${requestId}` as keyof SocialClientPluginEvents
    );
    if (!message) {
      throw new Error(
        `No response received from server (${server.peerId.toString()})`
      );
    }

    return (message as SocialUserGetResponseMessage).user;
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
    const localUser: Partial<SocialUser> = {
      name: this.name || "(guest)",
      avatar: this.avatar || "",
      did: this.client.id,
    };

    console.info(`plugin/social/client > saving local user`);
    const user = await this.table<SocialUser>("users").upsert(
      "did",
      this.client.id,
      localUser
    );
    // .findByIndex("did", this.client.id);
    if (!user?.id) {
      console.error(
        `plugin/social/client > failed to save local user, user not found after upsert (did: ${this.client.id}))`
      );
      return;
    }
  }

  async loadLocalUser() {
    const user = (
      await this.table<SocialUser>("users")
        .query()
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

  async getConnections(
    user: string,
    filter: SocialConnectionFilter,
    limit: number = 100
  ): Promise<SocialConnectionRecord[]> {
    const query = this.table<SocialConnectionRecord>("connections")
      .query()
      .limit(limit)
      .select();

    if (filter === "in" || filter === "mutual") {
      query.where("to", "=", user);
    } else if (filter === "out") {
      query.where("from", "=", user);
    }

    if (filter === "mutual") {
      query.or((qb) => {
        qb.select().where("from", "=", user);
      });
    }

    const results = (await query.execute()).all();

    console.info(`plugin/social/client > getConnections`, { filter, results });
    if (filter === "mutual") {
      return results
        .filter((row) => row.to === user)
        .filter((result) => {
          return results
            .filter((row) => row.from === user)
            .some((other) => {
              return other.from === result.to && other.to === result.from;
            });
        });
    }

    return results;
  }

  async getConnectionDirection(to: string, from: string = this.client.id) {
    const connections = await this.table<SocialConnectionRecord>("connections");
    const outgoing = await connections
      .query()
      .where("to", "=", to)
      .where("from", "=", from)
      .select()
      .execute()
      .then((result) => result.all());
    const incoming = await connections
      .query()
      .where("from", "=", to)
      .where("to", "=", from)
      .select()
      .execute()
      .then((result) => result.all());

    if (incoming.length > 0 && outgoing.length > 0) {
      return "mutual";
    }

    if (incoming.length > 0) {
      return "in";
    }

    if (outgoing.length > 0) {
      return "out";
    }

    return "none";
  }

  async getConnectionsCount(user: string, filter: SocialConnectionFilter) {
    const connections = await this.table<SocialConnectionRecord>("connections");
    if (filter === "all") {
      return connections
        .query()
        .where("from", "=", user)
        .or((qb) => qb.where("to", "=", user))
        .select()
        .execute()
        .then((result) => result.all().length);
    }
    if (filter === "in") {
      return connections
        .query()
        .where("to", "=", user)
        .select()
        .execute()
        .then((result) => result.all().length);
    }
    if (filter === "out") {
      return connections
        .query()
        .where("from", "=", user)
        .select()
        .execute()
        .then((result) => result.all().length);
    }
    if (filter === "mutual") {
      return connections
        .query()
        .where("from", "=", user)
        .and((qb) => qb.where("to", "=", user))
        .select()
        .execute()
        .then((result) => result.all().length);
    }
    throw new Error("Invalid filter");
  }

  async hasConnectionTo(user: string): Promise<boolean> {
    const connections = await this.table<SocialConnectionRecord>("connections")
      .query()
      .where("to", "=", user)
      .where("from", "=", this.client.id)
      .select()
      .execute()
      .then((result) => result.all());
    return connections.length > 0;
  }

  async hasConnectionFrom(user: string): Promise<boolean> {
    const connections = await this.table<SocialConnectionRecord>("connections")
      .query()
      .where("from", "=", user)
      .where("to", "=", this.client.id)
      .select()
      .execute()
      .then((result) => result.all());
    return connections.length > 0;
  }

  async hasMutualConnectionTo(user: string): Promise<boolean> {
    return (
      (await this.hasConnectionFrom(user)) && (await this.hasConnectionTo(user))
    );
  }

  async hasAnyConnectionTo(user: string): Promise<boolean> {
    return (
      (await this.hasConnectionFrom(user)) || (await this.hasConnectionTo(user))
    );
  }

  async onConnection(
    message:
      | IncomingP2PMessage<SocialClientEvents, "/social/connection">
      | IncomingPubsubMessage<SocialClientEvents, "/social/connection">
  ) {
    if (!message.peer?.did) {
      console.warn(
        `plugin/social/client > failed to create connection from unknown peer`,
        message
      );
      return;
    }

    if (message.payload.from !== message.peer.did) {
      console.warn(
        `plugin/social/client > refusing to create connection for another user`,
        {
          from: message.payload.from,
          did: message.peer.did,
        }
      );
      return;
    }

    const users = this.table<SocialUser>("users");

    let fromUserId = (await this.getUserByDID(message.peer.did))?.id;
    if (!fromUserId) {
      // we don't have the user, so we need to fetch it
      const { id, ...user } = await this.getUserFromServer(message.peer.did);
      if (user) {
        const fromUser = await users.upsert("did", message.peer.did, user);
        fromUserId = fromUser?.id;
      }
    }

    let toUserId = (await this.getUserByDID(message.payload.to))?.id;
    if (!toUserId) {
      // we don't have the user, so we need to fetch it
      const user = await this.getUserFromServer(message.payload.to);
      if (user) {
        const toUser = await users.upsert("did", message.payload.to, user);
        toUserId = toUser?.id;
      }
    }

    if (!fromUserId || !toUserId) {
      console.warn(
        `plugin/social/client > failed to create connection, missing user`,
        {
          fromUserId,
          toUserId,
        }
      );
      return;
    }

    const connectionsTable = await this.table<SocialConnectionRecord>(
      "connections"
    );

    const connection = await connectionsTable
      ?.query()
      .where("from", "=", message.payload.from)
      .where("to", "=", message.payload.to)
      .select()
      .execute()
      .then((result) => result.first() as SocialConnectionRecord | undefined);
    if (connection?.id) {
      await connectionsTable?.update(connection.id, {
        follow: message.payload.follow,
      });
    } else {
      await connectionsTable?.insert({
        from: message.payload.from,
        to: message.payload.to,
        follow: !!message.payload.follow,
      });
    }
  }

  async onAnnounce(
    message:
      | IncomingP2PMessage<
          SocialClientEvents,
          "/social/announce",
          EncodingOptions
        >
      | IncomingPubsubMessage<
          SocialClientEvents,
          "/social/announce",
          EncodingOptions
        >
  ) {
    if (!message?.peer?.did) {
      console.warn(
        `plugin/social/client > received social announce message from unauthenticated peer (peerId: ${message?.peer?.peerId})`,
        message
      );
      return;
    }

    console.info(
      `plugin/social/client > received social announce message (did: ${message.peer.did})`,
      message.payload
    );
    await this.table<SocialUser>("users")?.upsert("did", message.peer.did, {
      name: message.payload.name,
      bio: message.payload.bio,
      status: message.payload.status,
      avatar: message.payload.avatar,
      did: message.peer.did,
      updatedAt: message.payload.updatedAt,
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
            `plugin/social/client > discovered peer ${message.peer.peerId} (address: ${addr[0].multiaddr})`,
            addr
          );
        } else {
          const relayAddr = `${this.client.relayAddresses[0]}/p2p-circuit/p2p/${message.peer.peerId}`;
          console.warn(
            `plugin/social/client > discovered peer ${message.peer.peerId} without address, attempting relay (relay: ${relayAddr})`
          );
          await this.client.ipfs.libp2p.peerStore.addressBook.set(
            message.peer.peerId,
            [multiaddr(relayAddr)]
          );
        }
        await this.client.ipfs.swarm.connect(message.peer.peerId);
        await this.client.connect(message.peer.peerId);
      } else {
        console.warn(
          `plugin/social/client > already connected to peer ${message.peer.peerId}`
        );
        let peer = this.client.peers.getPeer(message.peer.peerId.toString());
        if (peer) {
          peer.peerId = message.peer.peerId;
          peer.did = message.peer.did;
          peer.connected = true;
          this.client.peers.updatePeer(peer.peerId.toString(), peer);
        } else {
          peer = this.client.peers.addPeer(message.peer.peerId, "peer");
          peer.did = message.peer.did;
          peer.connected = true;
          this.client.peers.updatePeer(peer.peerId.toString(), peer);
        }
      }
    } catch (e) {
      console.warn(
        `plugin/social/client > failed to connect to peer ${message.peer.peerId}`,
        e
      );
    }
  }

  async onUpdate(
    message: IncomingPubsubMessage<SocialClientEvents, "/social/update">
  ) {
    console.info(
      `plugin/social/client > received social update message`,
      message
    );
    const { post } = message.payload;
    const { id, did, cid, ...postData } = post;

    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social update message from unauthorized peer`
      );
      return;
    }

    const user = await this.getUserByDID(did);
    if (!user) {
      console.warn(
        `plugin/social/client > received social update message from unknown user`
      );
      return;
    }
    const saved = await this.table<SocialPost>("posts").upsert("cid", cid, {
      ...postData,
      did,
    });
    console.info(`plugin/social/client > saved post`, saved);
  }

  async onUpdatesRequest(
    message: IncomingP2PMessage<
      SocialClientEvents,
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

    const myPosts = await this.table<SocialPost>("posts")
      .query()
      .where("did", "=", this.client.id)
      .select()
      .execute()
      .then((result) => result.all());
    console.info(`plugin/social/client > sending updates response`, myPosts);
    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/updates/response",
      payload: {
        requestId: message.payload.requestId,
        updates: myPosts?.map((post) => post) || [],
      },
    });
  }

  async onUpdatesResponse(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/updates/response",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social updates response message from unauthorized peer`
      );
      return;
    }

    const updates = message.payload.updates;
    console.info(`plugin/social/client > received updates response`, updates);

    await Promise.all(
      updates
        .filter((post: SocialPost) => post.did !== undefined)
        .map(async ({ id, did, cid, ...post }: SocialPost) => {
          const user = did ? await this.getUserByDID(did) : undefined;
          if (!user) {
            console.warn(
              `plugin/social/client > received social update message from unknown user`
            );
            return;
          }

          const saved = await this.table<SocialPost>("posts").upsert(
            "cid",
            cid,
            {
              ...post,
              did,
            }
          );

          console.info(`plugin/social/client > saved post`, saved);
        })
    );
  }

  async createConnection(to: string) {
    const connection = await this.table("connections").insert({
      from: this.client.id,
      to,
      follow: true,
    });
    if (!connection) {
      console.warn(
        `plugin/social/client > failed to create connection (from: ${this.client.id}, to: ${to})`
      );
      return;
    }
    console.info(
      `plugin/social/client > created connection (from: ${this.client.id}, to: ${to})`,
      connection
    );
    await this.sendConnection(to);
  }

  async sendConnection(to: string, follow = true) {
    const message: SocialConnectionMessage = {
      from: this.client.id,
      to,
      follow,
      requestId: uuid(),
    };
    await this.client.publish("/social/connection", message, {
      sign: true,
      encrypt: false,
    });
  }

  async deleteConnection(from: string, to: string) {
    const connections = await this.table<SocialConnectionRecord>("connections");
    const connection = connections
      .query()
      .where("from", "=", from)
      .where("to", "=", to)
      .select()
      .execute()
      .then((result) => result.first());
    console.info(
      `plugin/social/client > deleting connection (from: ${this.client.id}, to: ${to})`,
      connection
    );
    const deleted = connections
      .query()
      .where("from", "=", from)
      .where("to", "=", to)
      .delete()
      .returning()
      .execute()
      .then((result) => result.first());
    if (!deleted) {
      console.warn(
        `plugin/social/client > failed to delete connection (from: ${this.client.id}, to: ${to})`
      );
      return;
    }
    console.info(
      `plugin/social/client > deleted connection (from: ${this.client.id}, to: ${to})`
    );
    await this.sendConnection(to, false);
  }

  async sendChatMessage(
    message: SocialChatMessageOutgoing
  ): Promise<SocialChatMessageRecord> {
    const chatMessage: Omit<SocialChatMessageRequest, "cid"> = {
      requestId: uuid(),
      from: this.client.id,
      ...message,
    };
    console.info("sending chat message");

    const cid = await this.client.dag.storeEncrypted(chatMessage, [message.to]);

    if (!cid) {
      throw new Error("failed to store chat message");
    }
    await this.client.ipfs.pin.add(cid, { recursive: true });

    const savedMessage: SocialChatMessageRequest = {
      ...chatMessage,
      cid: cid.toString(),
    };

    const peer = this.client.peers.getPeerByDID(message.to);
    // if the peer isn't online
    if (!peer || !peer.connected) {
      const encoded = await (this.client.plugins.candor as any)?.encodeMessage(
        {
          topic: "/social/chat/message/request",
          payload: savedMessage,
        },
        {
          encrypt: true,
          did: this.client.did,
        }
      );

      if (!encoded) {
        throw new Error("failed to encode chat message");
      }

      // it seems like giving another application cursor focus will cause the
      // application to stop sending messages

      console.info("sending chat message offline");
      await (
        this.client.getPlugin(
          "offlineSyncClient"
        ) as OfflineSyncClientPluginInterface
      )?.sendMessage<SocialClientEvents, "/social/chat/message/request">(
        message.to,
        encoded
      );
      console.info("done sending chat message offline");
    } else {
      await this.client.request(peer.peerId.toString(), {
        topic: "/social/chat/message/request",
        payload: savedMessage,
      });
    }

    const now = Date.now();
    const id = await this.table("chat_messages").insert({
      ...savedMessage,
      createdAt: now,
    });

    this.emit("/chat/message/sent", savedMessage);

    return {
      id,
      ...savedMessage,
      createdAt: now,
    } as SocialChatMessageRecord;
  }

  async onResponseMessage(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/users/search/response" | "/social/user/get/response",
      EncodingOptions
    >
  ) {
    const { requestId } = message.payload;
    console.info(
      `plugin/social/client > server response received (requestId: ${requestId})`,
      message
    );
    if (message.topic === "/social/users/search/response") {
      const users = (message.payload as SocialUserSearchResponseMessage)
        .results;
      if (!users) return;
      for (const { id, ...user } of users) {
        await this.table<SocialUser>("users").upsert("did", user.did, user);
      }
    }
    this.emit(
      `/response/${requestId}` as keyof SocialClientPluginEvents,
      message.payload
    );
  }

  async onChatMessageRequest(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/chat/message/request",
      EncodingOptions
    >
  ) {
    if (message.payload.to !== this.client.id) {
      console.warn(
        `plugin/social/client > received chat message request for another user (to: ${message.payload.to})`
      );
      return;
    }
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received chat message request from unauthorized peer`
      );
      return;
    }

    // TODO: server identity check
    // if (message.peer.did !== message.payload.from) {
    //   console.warn(
    //     `plugin/social/client > received chat message request from a peer with a different did (from: ${message.payload.from}, peer.did: ${message.peer.did})`
    //   );
    //   return;
    // }

    console.info(`plugin/social/client > received chat message request`, {
      message: message.payload,
    });

    const request = message.payload;
    const { cid, ...msg } = request;

    // TODO: fix this, the order of the keys is different
    const fromIPFS = await this.client.dag.loadDecrypted(cid);
    if (!fromIPFS) {
      console.warn(
        `plugin/social/client > received chat message request with invalid cid`,
        { expected: fromIPFS, received: msg }
      );
      return;
    }
    const sortedKeysIPFS = Object.keys(fromIPFS).sort();
    const sortedIPFS = sortedKeysIPFS.reduce((acc, key) => {
      acc[key] = fromIPFS[key];
      return acc;
    }, {} as Record<string, unknown>);
    const sortedKeysMsg = Object.keys(msg).sort();
    const sortedMsg = sortedKeysMsg.reduce((acc, key) => {
      acc[key] = (msg as any)[key];
      return acc;
    }, {} as Record<string, unknown>);
    if (JSON.stringify(sortedIPFS) !== JSON.stringify(sortedMsg)) {
      console.warn(
        `plugin/social/client > received chat message request with invalid cid`,
        { expected: sortedIPFS, received: sortedMsg }
      );
      return;
    }

    await this.client.ipfs.pin.add(cid);
    const stored = await this.table<SocialChatMessageRecord>(
      "chat_messages"
    ).upsert("requestId", request.requestId, {
      ...msg,
      cid,
      createdAt: Date.now(),
      acceptedAt: Date.now(),
    });

    console.info(`plugin/social/client > stored chat message`, stored);

    this.emit("/chat/message/received", stored);

    console.info(
      `plugin/social/client > saved incoming chat message (cid: ${cid})`,
      stored
    );
    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/chat/message/response",
      payload: {
        requestId: message.payload.requestId,
        accepted: true,
        cid,
      },
    });
  }

  async onChatMessageResponse(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/chat/message/response",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received chat message response from unauthorized peer`
      );
      return;
    }

    const { cid } = message.payload;
    const stored = await this.table<SocialChatMessageRecord>("chat_messages")
      .query()
      .where("cid", "=", cid)
      .select()
      .execute()
      .then((result) => result.first());

    if (!stored) {
      console.warn(
        `plugin/social/client > received chat message response for unknown message (cid: ${cid})`
      );
      return;
    }

    const updated = await this.table<SocialChatMessageRecord>(
      "chat_messages"
    ).update(stored.id, {
      acceptedAt: Date.now(),
    });

    this.emit("/chat/message/response", updated);
  }
}

export default SocialClientPlugin;
