import { v4 as uuid } from "uuid";
import {
  EncodingOptions,
  IncomingP2PMessage,
  IncomingPubsubMessage,
  Peer,
} from "@cinderlink/core-types";
import {
  SocialClientEvents,
  SocialUser,
  SocialUserStatus,
} from "@cinderlink/plugin-social-core";
import { checkAddressVerification } from "@cinderlink/identifiers";
import SocialClientPlugin from "../plugin";
const logModule = "plugins";
const pluginName = "social-client";
export class SocialUsers {
  localUser: Partial<SocialUser> = {
    name: "",
    avatar: "",
    bio: "",
    address: undefined,
    addressVerification: "",
    status: "online",
    updatedAt: 0,
  };
  userStatusInterval: NodeJS.Timer | null = null;
  announceInterval: NodeJS.Timer | null = null;
  hasServerConnection = false;
  loadingLocalUser = false;

  constructor(private plugin: SocialClientPlugin) {}

  async start() {
    await this.loadLocalUser();
    this.plugin.client.on("/cinderlink/handshake/success", async (peer) => {
      if (peer.role === "server") {
        this.hasServerConnection = true;
      } else {
        await this.setUserStatus(peer.did as string, "online");
      }

      if (
        this.localUser?.name &&
        this.localUser.name !== "guest" &&
        this.plugin.client.addressVerification
      ) {
        await this.announce(peer.peerId.toString());
      }
    });

    this.plugin.client.on("/peer/connect", async (peer: Peer) => {
      if (peer.role === "peer" && peer.did) {
        await this.setUserStatus(peer.did as string, "online");
      }
    });

    this.plugin.client.on("/peer/disconnect", async (peer: Peer) => {
      this.plugin.client.logger.info(
        logModule,
        `${pluginName}/start: peer disconnected`,
        { peer }
      );
      if (peer.role === "peer" && peer.did) {
        await this.setUserStatus(peer.did as string, "offline");
      }
    });

    this.announceInterval = setInterval(async () => {
      if (
        !this.hasServerConnection ||
        !this.localUser?.name ||
        this.localUser.name === "guest"
      )
        return;
      this.plugin.client.logger.info(
        logModule,
        `${pluginName}/start: announcing (pubsub, interval)`
      );
      await this.announce();
    }, Number(this.plugin.options.announceInterval || 5000));

    const connections = await this.plugin.connections.getConnections(
      this.plugin.client.id,
      "out"
    );
    const connectedUsers = connections.map((c) => c.to);
    for (const did of connectedUsers) {
      const user = await this.getUserByDID(did);
      if (!user) {
        await this.plugin.users.searchUsers(did);
      }
    }

    this.localUser.status === "online";
    await this.saveLocalUser();
    await this.announce();
  }

  async stop() {
    if (this.userStatusInterval) {
      clearInterval(this.userStatusInterval);
    }
    if (this.announceInterval) {
      clearInterval(this.announceInterval);
    }
  }

  async setUserStatus(did: string, status: SocialUserStatus) {
    const table = this.plugin.table<SocialUser>("users");
    this.plugin.client.logger.info(
      logModule,
      `user ${did} status changed to '${status}'`,
      { did, status }
    );
    await table
      .query()
      .where("did", "=", did)
      .update({ status, updatedAt: Date.now() })
      .execute();
  }

  async announce(to: string | undefined = undefined) {
    if (!this.plugin.client.address.length) {
      throw new Error("client address not set");
    }
    if (!this.plugin.client.addressVerification.length) {
      throw new Error("client address verification not set");
    }
    if (!this.plugin.client.did) {
      throw new Error("client did not set");
    }

    const payload: Partial<SocialUser> = {
      ...this.localUser,
      status: "online",
      address: this.plugin.client.address,
      addressVerification: this.plugin.client.addressVerification,
    };
    if (to) {
      this.plugin.client.logger.info(
        logModule,
        `${pluginName}/announce annoucing (p2p)`,
        {
          topic: "/social/users/announce",
          payload,
        }
      );
      await this.plugin.client.send<SocialClientEvents>(to, {
        topic: "/social/users/announce",
        payload,
      });
    } else {
      this.plugin.client.logger.info(
        logModule,
        `${pluginName}/announce annoucing (pubsub)`,
        payload
      );
      await this.plugin.client.publish("/social/users/announce", payload);

      for (let peer of this.plugin.client.peers.getAllPeers()) {
        await this.plugin.client.ipfs.ping(peer.peerId);
      }
    }
  }

  async getLocalUser(): Promise<SocialUser | undefined> {
    return this.getUserByDID(this.plugin.client.id);
  }

  async getLocalUserId(): Promise<number | undefined> {
    const user = await this.getLocalUser();
    return user?.id;
  }

  async getLocalUserUid(): Promise<string | undefined> {
    const user = await this.getLocalUser();
    return user?.uid;
  }

  async searchUsers(query: string) {
    // TODO: add method to send to all servers & aggregate unique responses
    const requestId: string = uuid();
    const server = this.plugin.client.peers.getServers()[0];
    if (!server) {
      throw new Error("No servers found");
    }

    const response = await this.plugin.client.request<
      SocialClientEvents,
      "/social/users/search/request",
      "/social/users/search/response"
    >(server.peerId.toString(), {
      topic: "/social/users/search/request",
      payload: {
        requestId,
        query,
      },
    });

    if (!response) {
      throw new Error(
        `No response received from server (${server.peerId.toString()})`
      );
    }

    return response.payload.results;
  }

  async setState(update: Partial<SocialUser>) {
    this.localUser = {
      ...this.localUser,
      ...update,
      did: this.plugin.client.id,
      address: this.plugin.client.address,
      addressVerification: this.plugin.client.addressVerification,
    };
    await this.saveLocalUser();
  }

  async saveLocalUser() {
    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/saveLocalUser: saving local user`
    );
    const user = await this.plugin.table<SocialUser>("users").upsert(
      { did: this.plugin.client.id },
      {
        ...this.localUser,
        did: this.plugin.client.id,
        status: "online",
        updatedAt: Date.now(),
      }
    );
    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/saveLocalUser: saved local user`,
      { user, localUser: this.localUser }
    );

    this.localUser = user;
    // .findByIndex("did", this.plugin.client.id);
    if (!user?.id) {
      this.plugin.client.logger.error(
        logModule,
        `${pluginName}/saveLocalUser: failed to save local user, user not found after upsert`,
        { did: this.plugin.client.id }
      );

      return;
    }
  }

  async loadLocalUser() {
    if (!this.plugin.client.identity.hasResolved) {
      this.plugin.client.logger.info(
        logModule,
        `${pluginName}/loadLocalUser: identity not resolved, waiting...`
      );
      return;
    } else if (this.loadingLocalUser) {
      return;
    }

    this.loadingLocalUser = true;
    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/loadLocalUser: loading local user...`
    );
    const user = (
      await this.plugin
        .table<SocialUser>("users")
        .query()
        .where("did", "=", this.plugin.client.id)
        .select()
        .execute()
    )?.first();
    if (!user) {
      this.plugin.client.logger.warn(
        logModule,
        `${pluginName}/loadLocalUser: local user not found, returning...`
      );
      return;
    }

    this.localUser = {
      ...user,
      address: this.plugin.client.address,
      addressVerification: this.plugin.client.addressVerification,
      status: "online",
    };
    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/loadLocalUser: local user loaded`,
      this.localUser
    );
  }

  async getUserFromServer(did: string): Promise<SocialUser | undefined> {
    const servers = this.plugin.client.peers.getServers();
    let result: SocialUser | undefined;

    await Promise.all(
      servers
        .filter((s) => s.connected && s.authenticated)
        .map(async (server) => {
          await this.plugin.client
            .request<
              SocialClientEvents,
              "/social/users/get/request",
              "/social/users/get/response"
            >(server.peerId.toString(), {
              topic: "/social/users/get/request",
              payload: {
                requestId: uuid(),
                did,
              },
            })
            .then((response) => {
              if (
                Number(response?.payload.user.updatedAt) >
                Number(result?.updatedAt)
              ) {
                result = response?.payload.user;
              }
            });
        })
    );
    return result;
  }

  async getUserByDID(did: string): Promise<SocialUser | undefined> {
    const user = await this.plugin
      .table<SocialUser>("users")
      .query()
      .where("did", "=", did)
      .select()
      .execute()
      .then((result) => result.first() as SocialUser | undefined);
    if (user) {
      return user;
    }

    const serverUser = await this.getUserFromServer(did);
    if (serverUser) {
      const { name, avatar, address, addressVerification, updatedAt } =
        serverUser;
      return this.plugin
        .table<SocialUser>("users")
        .upsert(
          { did },
          { name, avatar, address, addressVerification, updatedAt }
        );
    }

    return undefined;
  }

  async getUser(uid: string): Promise<SocialUser | undefined> {
    return this.plugin
      .table("users")
      ?.query()
      .where("uid", "=", uid)
      .select()
      .execute()
      .then((result) => result.first() as SocialUser | undefined);
  }

  async onAnnounce(
    message:
      | IncomingP2PMessage<
          SocialClientEvents,
          "/social/users/announce",
          EncodingOptions
        >
      | IncomingPubsubMessage<
          SocialClientEvents,
          "/social/users/announce",
          EncodingOptions
        >
  ) {
    if (!message.payload.address) {
      this.plugin.client.logger.warn(
        logModule,
        `${pluginName}/onAnnounce: received social announce message from peer without address`,
        { did: message.peer.did }
      );

      return;
    }

    if (!message.payload.addressVerification) {
      this.plugin.client.logger.warn(
        logModule,
        `${pluginName}/onAnnounce: received social announce message from peer without address verification`,
        { did: message.peer.did }
      );

      return;
    }

    if (!message.payload.did || !message.payload.did.length) {
      this.plugin.client.logger.warn(
        logModule,
        `${pluginName}/onAnnounce: received social announce message from peer without did`,
        { did: message.peer.did }
      );

      return;
    }

    const verified = await checkAddressVerification(
      "candor.social",
      message.payload.did,
      message.payload.address,
      message.payload.addressVerification
    ).catch(() => undefined);
    if (!verified) {
      this.plugin.client.logger.warn(
        logModule,
        `${pluginName}/onAnnounce: received secial announce message from peer with invalid address verification`,
        { did: message.peer.did }
      );

      return;
    }

    if (message.payload.did) {
      this.plugin.client.peers.updatePeer(message.peer.peerId.toString(), {
        did: message.payload.did,
        authenticated: true,
      });
    }

    if (!message.peer.did) {
      this.plugin.client.peers.updatePeer(message.peer.peerId.toString(), {
        did: message.payload.did,
      });
    }

    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/onAnnounce: received social announce message`,
      {
        did: message.payload.did,
        connected: message.peer.connected,
        payload: message.payload,
      }
    );

    await this.plugin.table<SocialUser>("users")?.upsert(
      { did: message.payload.did },
      {
        address: message.payload.address,
        addressVerification: message.payload.addressVerification,
        name: message.payload.name,
        bio: message.payload.bio,
        status: "online",
        avatar: message.payload.avatar,
        did: message.payload.did,
        updatedAt: message.payload.updatedAt,
      }
    );

    try {
      const peers = this.plugin.client.ipfs.libp2p.getPeers() || [];
      if (
        peers.length < this.plugin.maxConnectionCount &&
        (!this.plugin.client.peers.hasPeer(message.peer.peerId.toString()) ||
          !this.plugin.client.peers.getPeer(message.peer.peerId.toString())
            ?.connected)
      ) {
        this.plugin.client.logger.info(
          logModule,
          `${pluginName}/onAnnounce: connecting to peer`,
          { peerId: message.peer.peerId }
        );

        await this.plugin.client.connect(message.peer.peerId);
      }
    } catch (e) {
      this.plugin.client.logger.error(
        logModule,
        `${pluginName}/onAnnounce: failed to connect to peer`,
        {
          peerId: message.peer.peerId,
          error: e,
        }
      );

      this.plugin.client.ipfs.libp2p.peerStore.delete(message.peer.peerId);
    }
  }

  async onPinResponse(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/users/pin/response",
      EncodingOptions
    >
  ) {
    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/onPinResponse: received social pin response`,
      { did: message.peer.did, payload: message.payload }
    );
  }

  async onGetResponse(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/users/get/response",
      EncodingOptions
    >
  ) {
    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/onGetResponse: received social users get response`,
      { did: message.peer.did, payload: message.payload }
    );
  }

  async onSearchResponse(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/users/search/response",
      EncodingOptions
    >
  ) {
    this.plugin.client.logger.info(
      logModule,
      `${pluginName}/onSearchResponse: received user search response`,
      { did: message.peer.did, payload: message.payload }
    );

    // insert users we don't have
    await Promise.all(
      message.payload.results.map(async (user) => {
        const existing = await this.plugin.users.getUserByDID(user.did);
        if (!existing) {
          await this.plugin.table<SocialUser>("users")?.insert({
            did: user.did,
            name: user.name,
            bio: user.bio,
            status: "offline",
            avatar: user.avatar,
            updatedAt: user.updatedAt,
          });
        }
      })
    );
  }
}
