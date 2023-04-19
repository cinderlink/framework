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

export class SocialUsers {
  localUser: Partial<SocialUser> = {
    name: "",
    avatar: "",
    bio: "",
    address: "",
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
    this.plugin.client.pluginEvents.on(
      "/cinderlink/handshake/success",
      async (peer) => {
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
      }
    );

    this.plugin.client.on("/peer/connect", async (peer: Peer) => {
      if (peer.role === "peer" && peer.did) {
        await this.setUserStatus(peer.did as string, "online");
      }
    });

    this.plugin.client.on("/peer/disconnect", async (peer: Peer) => {
      if (peer.role === "peer") {
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
      console.info(`plugin/social/client > announcing (pubsub, interval)`);
      await this.announce();
    }, Number(this.plugin.options.announceInterval || 30000));

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

    this.userStatusInterval = setInterval(
      this.updateUserStatuses.bind(this),
      3000
    );

    this.localUser.status === "online";
    await this.saveLocalUser();
    await this.updateUserStatuses();
    await this.announce();
  }

  async updateUserStatuses() {
    const peers = this.plugin.client.peers
      .getPeers()
      .filter((p) => p.did && p.connected);

    await this.plugin
      .table<SocialUser>("users")
      .query()
      .where("status", "!=", "offline")
      .where(
        "did",
        "!in",
        peers.map((p) => p.did as string)
      )
      .update({ status: "offline" })
      .execute();

    await this.plugin
      .table<SocialUser>("users")
      .query()
      .where("status", "!=", "online")
      .where(
        "did",
        "in",
        peers.map((p) => p.did as string)
      )
      .update({ status: "online" })
      .execute();
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
    await this.plugin
      .table<SocialUser>("users")
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
    console.info(
      `plugin/social/client > address`,
      this.plugin.client.address,
      this.plugin.client.addressVerification
    );
    const payload: Partial<SocialUser> = {
      ...this.localUser,
      status: "online",
      address: this.plugin.client.address,
      addressVerification: this.plugin.client.addressVerification,
    };
    if (to) {
      console.info(`plugin/social/client > announcing (p2p)`, payload);
      await this.plugin.client.send<SocialClientEvents>(to, {
        topic: "/social/users/announce",
        payload,
      });
    } else {
      console.info(`plugin/social/client > announcing (pubsub)`, payload);
      await this.plugin.client.publish("/social/users/announce", payload);
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
    console.info(`plugin/social/client > saving local user`);
    const user = await this.plugin.table<SocialUser>("users").upsert(
      { did: this.plugin.client.id },
      {
        ...this.localUser,
        did: this.plugin.client.id,
        updatedAt: Date.now(),
      }
    );
    console.info(
      `plugin/social/client > saved local user`,
      user,
      this.localUser
    );
    this.localUser = user;
    // .findByIndex("did", this.plugin.client.id);
    if (!user?.id) {
      console.error(
        `plugin/social/client > failed to save local user, user not found after upsert (did: ${this.plugin.client.id}))`
      );
      return;
    }
  }

  async loadLocalUser() {
    if (!this.plugin.client.identity.hasResolved) {
      console.info("plugin/social/client > identity not resolved, waiting...");
      return;
    } else if (this.loadingLocalUser) {
      return;
    }

    this.loadingLocalUser = true;
    console.info("plugin/social/client > loading local user...");
    const user = (
      await this.plugin
        .table<SocialUser>("users")
        .query()
        .where("did", "=", this.plugin.client.id)
        .select()
        .execute()
    )?.first();
    if (!user) {
      console.info("plugin/social/client > local user not found, returning...");
      return;
    }

    this.localUser = {
      ...user,
      address: this.plugin.client.address,
      addressVerification: this.plugin.client.addressVerification,
      status: "online",
    };
    console.info("plugin/social/client > local user loaded", this.localUser);
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
      console.warn(
        `plugin/social/client > received social announce message from peer without address (did: ${message.peer.did})`,
        message
      );
      return;
    }

    if (!message.payload.addressVerification) {
      console.warn(
        `plugin/social/client > received social announce message from peer without address verification (did: ${message.peer.did})`,
        message
      );
      return;
    }

    if (!message.payload.did || !message.payload.did.length) {
      console.warn(
        `plugin/social/client > received social announce message from peer without did (did: ${message.peer.did})`,
        message
      );
      return;
    }

    const verified = await checkAddressVerification(
      "candor.social",
      message.payload.did,
      message.payload.address,
      message.payload.addressVerification
    );
    if (!verified) {
      console.warn(
        `plugin/social/client > received secial announce message from peer with invalid address verification (did: ${message.peer.did})`,
        message
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

    console.info(
      `plugin/social/client > received social announce message (did: ${message.payload.did}, connected: ${message.peer.connected})`,
      message.payload
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
        console.info(
          `plugin/social/client > connecting to peer ${message.peer.peerId}`
        );
        await this.plugin.client.connect(message.peer.peerId);
      }
    } catch (e) {
      console.warn(
        `plugin/social/client > failed to connect to peer ${message.peer.peerId}`,
        e
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
    console.info(
      `plugin/social/client > received social pin response (did: ${message.peer.did})`,
      message.payload
    );
  }

  async onGetResponse(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/users/get/response",
      EncodingOptions
    >
  ) {
    console.info(
      `plugin/social/client > received social users get response (did: ${message.peer.did})`,
      message.payload
    );
  }

  async onSearchResponse(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/users/search/response",
      EncodingOptions
    >
  ) {
    console.info(
      `plugin/social/client > received user search response (did: ${message.peer.did})`,
      message.payload
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
