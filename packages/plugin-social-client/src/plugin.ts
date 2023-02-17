import type {
  PluginInterface,
  CandorClientInterface,
  PubsubMessage,
  Peer,
  P2PMessage,
  TableRow,
  TableDefinition,
  CandorClientEventDef,
} from "@candor/core-types";
import Emittery from "emittery";
import { v4 as uuid } from "uuid";
import { SocialClientEvents } from "./types";
import {
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
  SocialUserGetResponseMessage,
  SocialChatMessageOutgoing,
  SocialChatMessageRequest,
  SocialChatMessageResponse,
  SocialChatMessageRecord,
  SocialConnectionFilter,
} from "@candor/plugin-social-core";
import { loadSocialSchema } from "@candor/plugin-social-core";
import { multiaddr } from "@multiformats/multiaddr";
import type {
  OfflineSyncClientEvents,
  OfflineSyncClientPluginInterface,
} from "@candor/plugin-offline-sync-core";

export class SocialClientPlugin<
    PluginEvents extends SocialClientEvents = SocialClientEvents
  >
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
    public client: CandorClientInterface<PluginEvents>,
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

      if (this.name && this.name !== "guest") {
        console.info(`plugin/social/client > announcing (pubsub)`, {
          name: this.name,
          avatar: this.avatar,
          bio: this.bio,
          status: this.status,
        });
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

      if (await this.hasConnectionTo(peer.peerId.toString())) {
        console.info(
          `plugin/social/client > followed peer connected: ${peer.peerId}, dialing...`
        );
        await this.client.connect(peer.peerId);
      }
    });

    this.interval = setInterval(async () => {
      if (!hasConnected || !this.name || this.name === "guest") return;
      console.info(`plugin/social/client > announcing (pubsub, interval)`);
      await this.publishAnnounceMessage();
    }, Number(this.options.interval || 1000 * 60));

    await this.loadLocalUser();

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
      { sign: true }
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

  async createPost(
    postData: Omit<Omit<Omit<SocialPost, "cid">, "id">, "authorId">
  ): Promise<SocialPost> {
    const authorId = await this.getLocalUserId();
    if (authorId === undefined) {
      throw new Error("failed to get local user id");
    }

    const cid = await this.client.dag.store({ ...postData, authorId });
    if (!cid) {
      throw new Error("failed to store post");
    }

    const post = { ...postData, authorId, cid: cid.toString() };
    const saved = await this.table<SocialPost>("posts").upsert(
      "cid",
      cid.toString(),
      post
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
      { sign: true }
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

  async getUserPosts(userId: number): Promise<SocialPost[]> {
    const posts = await this.table<SocialPost>("posts")
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
      data: {
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
      data: {
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
        qb.where("from", "=", user);
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

    if (message.data.from !== message.peer.did) {
      console.warn(
        `plugin/social/client > refusing to create connection for another user`,
        {
          from: message.data.from,
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

    let toUserId = (await this.getUserByDID(message.data.to))?.id;
    if (!toUserId) {
      // we don't have the user, so we need to fetch it
      const user = await this.getUserFromServer(message.data.to);
      if (user) {
        const toUser = await users.upsert("did", message.data.to, user);
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
      .where("from", "=", message.data.from)
      .where("to", "=", message.data.to)
      .select()
      .execute()
      .then((result) => result.first() as SocialConnectionRecord | undefined);
    if (connection?.id) {
      await connectionsTable?.update(connection.id, {
        follow: message.data.follow,
      });
    } else {
      await connectionsTable?.insert({
        from: message.data.from,
        to: message.data.to,
        follow: !!message.data.follow,
      });
    }
  }

  async onAnnounce(
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
    await this.table<SocialUser>("users")?.upsert("did", message.peer.did, {
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
    message:
      | PubsubMessage<SocialUpdateMessage>
      | P2PMessage<string, SocialUpdateMessage>
  ) {
    console.info(
      `plugin/social/client > received social update message`,
      message
    );
    const { post } = message.data;
    const { id, ...postData } = post;

    const cid = await this.client.dag.store(postData);
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
    const saved = await this.table<SocialPost>("posts").upsert(
      "cid",
      cid.toString(),
      {
        ...postData,
        authorId,
      }
    );
    console.info(`plugin/social/client > saved post`, saved);
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

    const fromUserId = (await this.getUserByDID(message.peer.did))?.id;
    if (!fromUserId) {
      console.warn(
        `plugin/social/client > received social updates request message from unknown user`
      );
      return;
    }
    // TODO: make sure this user is allowed to see this data
    const myPosts = await this.table<SocialPost>("posts")
      .query()
      .where("authorId", "=", fromUserId)
      .select()
      .execute()
      .then((result) => result.all());
    console.info(`plugin/social/client > sending updates response`, myPosts);
    await this.client.send(message.peer.peerId.toString(), {
      topic: "/social/updates/response",
      data: {
        requestId: message.data.requestId,
        updates: myPosts?.map((post) => post) || [],
      },
    });
  }

  async onUpdatesResponse(
    message:
      | PubsubMessage<SocialUpdatesResponseMessage>
      | P2PMessage<string, SocialUpdatesResponseMessage>
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social updates response message from unauthorized peer`
      );
      return;
    }

    const updates = message.data.updates;
    if (!updates) return;
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
    if (
      !peer ||
      !peer.connected ||
      !this.client.protocol[peer.peerId.toString()]
    ) {
      const encoded = await this.client.encodeMessage<
        SocialClientEvents["send"] & CandorClientEventDef["send"],
        "/social/chat/message/request"
      >(
        {
          topic: "/social/chat/message/request",
          data: savedMessage,
        },
        {
          encrypt: true,
        }
      );

      // it seems like giving another application cursor focus will cause the
      // application to stop sending messages

      console.info("sending chat message offline");
      await this.client
        .getPlugin<OfflineSyncClientEvents, OfflineSyncClientPluginInterface>(
          "offlineSyncClient"
        )
        ?.sendMessage<
          SocialClientEvents["send"],
          "/social/chat/message/request"
        >(message.to, encoded);
      console.info("done sending chat message offline");
    } else {
      await this.client.request(peer.peerId.toString(), {
        topic: "/social/chat/message/request",
        data: savedMessage,
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
    message: P2PMessage<
      string,
      SocialUserGetResponseMessage | SocialUserSearchResponseMessage
    >
  ) {
    const { requestId } = message.data;
    console.info(
      `plugin/social/client > server response received (requestId: ${requestId})`,
      message
    );
    if (message.topic === "/social/users/search/response") {
      const users = (message.data as SocialUserSearchResponseMessage).results;
      if (!users) return;
      for (const { id, ...user } of users) {
        await this.table<SocialUser>("users").upsert("did", user.did, user);
      }
    }
    this.emit(
      `/response/${requestId}` as keyof SocialClientPluginEvents,
      message.data
    );
  }

  async onChatMessageRequest(
    message: P2PMessage<string, SocialChatMessageRequest>
  ) {
    if (message.data.to !== this.client.id) {
      console.warn(
        `plugin/social/client > received chat message request for another user (to: ${message.data.to})`
      );
      return;
    }
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received chat message request from unauthorized peer`
      );
      return;
    }
    if (message.peer.did !== message.data.from) {
      console.warn(
        `plugin/social/client > received chat message request from a peer with a different did (from: ${message.data.from}, peer.did: ${message.peer.did})`
      );
      return;
    }

    console.info(`plugin/social/client > received chat message request`, {
      message: message.data,
    });

    const request = message.data;
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
      data: {
        requestId: message.data.requestId,
        accepted: true,
        cid,
      },
    });
  }

  async onChatMessageResponse(
    message: P2PMessage<string, SocialChatMessageResponse>
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received chat message response from unauthorized peer`
      );
      return;
    }

    const { cid } = message.data;
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
