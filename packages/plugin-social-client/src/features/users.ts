import { multiaddr } from "@multiformats/multiaddr";
import { v4 as uuid } from "uuid";
import {
  EncodingOptions,
  IncomingP2PMessage,
  IncomingPubsubMessage,
  Peer,
} from "@cinderlink/core-types";
import {
  SocialClientEvents,
  SocialClientPluginEvents,
  SocialUser,
  SocialUsersSearchResponse,
} from "@cinderlink/plugin-social-core";
import { checkAddressVerification } from "@cinderlink/identifiers";
import SocialClientPlugin from "../plugin";

export class SocialUsers {
  localUser: SocialUser = {
    id: 0,
    did: "",
    name: "",
    avatar: "",
    bio: "",
    address: "",
    addressVerification: "",
    status: "online",
    updatedAt: Date.now(),
  };
  announceInterval: NodeJS.Timer | null = null;
  hasServerConnection = false;

  constructor(private plugin: SocialClientPlugin) {}

  async start() {
    this.plugin.client.pluginEvents.on(
      "/cinderlink/handshake/success",
      async (peer: Peer) => {
        console.info("handshake success, getting updates");

        if (peer.role === "server") {
          this.hasServerConnection = true;
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

    this.announceInterval = setInterval(async () => {
      if (
        !this.hasServerConnection ||
        !this.localUser?.name ||
        this.localUser.name === "guest"
      )
        return;
      console.info(`plugin/social/client > announcing (pubsub, interval)`);
      await this.announce();
    }, Number(this.plugin.options.announceInterval || 1000 * 60));

    await this.loadLocalUser();
  }

  async announce(to: string | undefined = undefined) {
    if (!this.plugin.client.address) {
      throw new Error("client address not set");
    }
    if (!this.plugin.client.addressVerification) {
      throw new Error("client address verification not set");
    }
    if (!this.plugin.client.did) {
      throw new Error("client did not set");
    }
    const payload = {
      requestId: uuid(),
      address: this.plugin.client.address,
      addressVerification: this.plugin.client.addressVerification,
      ...this.localUser,
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

  async getUserFromServer(did: string, server?: Peer) {
    const requestId: string = uuid();
    if (!server) {
      server = this.plugin.client.peers.getServers()[0];
    }

    if (!server) {
      throw new Error("No servers found");
    }

    const response = await this.plugin.client.request<
      SocialClientEvents,
      "/social/users/get/request",
      "/social/users/get/response"
    >(server.peerId.toString(), {
      topic: "/social/users/get/request",
      payload: {
        requestId,
        did,
      },
    });

    if (!response) {
      throw new Error(
        `No response received from server (${server.peerId.toString()})`
      );
    }

    return response.payload.user;
  }

  async setState(update: Partial<SocialUser>) {
    this.localUser = {
      ...this.localUser,
      ...update,
    };
    await this.saveLocalUser();
  }

  async saveLocalUser() {
    console.info(`plugin/social/client > saving local user`);
    const user = await this.plugin
      .table<SocialUser>("users")
      .upsert({ did: this.plugin.client.id }, this.localUser);
    // .findByIndex("did", this.plugin.client.id);
    if (!user?.id) {
      console.error(
        `plugin/social/client > failed to save local user, user not found after upsert (did: ${this.plugin.client.id}))`
      );
      return;
    }
  }

  async loadLocalUser() {
    const user = (
      await this.plugin
        .table<SocialUser>("users")
        .query()
        .where("did", "=", this.plugin.client.id)
        .select()
        .execute()
    )?.first();
    this.localUser = user;
  }

  async getUserByDID(did: string): Promise<SocialUser | undefined> {
    return this.plugin
      .table<SocialUser>("users")
      .query()
      .where("did", "=", did)
      .select()
      .execute()
      .then((result) => result.first() as SocialUser | undefined);
  }

  async getUser(userId: number): Promise<SocialUser | undefined> {
    return this.plugin
      .table("users")
      ?.query()
      .where("id", "=", userId)
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
    if (!message?.peer?.did) {
      console.warn(
        `plugin/social/client > received social announce message from unauthenticated peer (peerId: ${message?.peer?.peerId})`,
        message
      );
      return;
    }

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

    const verified = await checkAddressVerification(
      "cinderlink.social",
      message.peer.did,
      message.payload.address,
      message.payload.addressVerification
    );
    if (!verified) {
      console.warn(
        `plugin/social/client > received social announce message from peer with invalid address verification (did: ${message.peer.did})`,
        message
      );
      return;
    }

    console.info(
      `plugin/social/client > received social announce message (did: ${message.peer.did})`,
      message.payload
    );
    await this.plugin.table<SocialUser>("users")?.upsert(
      { did: message.peer.did },
      {
        address: message.payload.address,
        addressVerification: message.payload.addressVerification,
        name: message.payload.name,
        bio: message.payload.bio,
        status: message.payload.status,
        avatar: message.payload.avatar,
        did: message.peer.did,
        updatedAt: message.payload.updatedAt,
      }
    );

    try {
      const peers = this.plugin.client.ipfs.libp2p.getPeers() || [];
      if (
        peers.length < this.plugin.maxConnectionCount &&
        !peers
          .map((p) => p.toString())
          ?.includes(message.peer.peerId.toString())
      ) {
        const addr =
          await this.plugin.client.ipfs.libp2p.peerStore.addressBook.get(
            message.peer.peerId
          );
        if (addr[0]) {
          console.warn(
            `plugin/social/client > discovered peer ${message.peer.peerId} (address: ${addr[0].multiaddr})`,
            addr
          );
        } else {
          const relayAddr = `${this.plugin.client.relayAddresses[0]}/p2p-circuit/p2p/${message.peer.peerId}`;
          console.warn(
            `plugin/social/client > discovered peer ${message.peer.peerId} without address, attempting relay (relay: ${relayAddr})`
          );
          await this.plugin.client.ipfs.libp2p.peerStore.addressBook.set(
            message.peer.peerId,
            [multiaddr(relayAddr)]
          );
        }
        await this.plugin.client.ipfs.swarm.connect(message.peer.peerId);
        await this.plugin.client.connect(message.peer.peerId);
      } else {
        console.warn(
          `plugin/social/client > already connected to peer ${message.peer.peerId}`
        );
        let peer = this.plugin.client.peers.getPeer(
          message.peer.peerId.toString()
        );
        if (peer) {
          peer.peerId = message.peer.peerId;
          peer.did = message.peer.did;
          peer.connected = true;
          this.plugin.client.peers.updatePeer(peer.peerId.toString(), peer);
        } else {
          peer = this.plugin.client.peers.addPeer(message.peer.peerId, "peer");
          peer.did = message.peer.did;
          peer.connected = true;
          this.plugin.client.peers.updatePeer(peer.peerId.toString(), peer);
        }
      }
    } catch (e) {
      console.warn(
        `plugin/social/client > failed to connect to peer ${message.peer.peerId}`,
        e
      );
      this.plugin.client.ipfs.libp2p.peerStore.delete(message.peer.peerId);
    }
  }

  async onResponseMessage(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/users/search/response" | "/social/users/get/response",
      EncodingOptions
    >
  ) {
    const { requestId } = message.payload;
    console.info(
      `plugin/social/client > server response received (requestId: ${requestId})`,
      message
    );
    if (message.topic === "/social/users/search/response") {
      const users = (message.payload as SocialUsersSearchResponse).results;
      if (!users) return;
      for (const { id, ...user } of users) {
        await this.plugin
          .table<SocialUser>("users")
          .upsert({ did: user.did }, user);
      }
    }
    console.info("this", this);
    this.plugin.emit(
      `/response/${requestId}` as keyof SocialClientPluginEvents,
      message.payload
    );
  }
}
