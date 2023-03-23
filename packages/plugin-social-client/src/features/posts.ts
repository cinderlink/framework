import { v4 as uuid } from "uuid";
import {
  EncodingOptions,
  IncomingP2PMessage,
  IncomingPubsubMessage,
  Peer,
} from "@cinderlink/core-types";
import { SocialClientEvents, SocialPost } from "@cinderlink/plugin-social-core";
import SocialClientPlugin from "../plugin";

export class SocialPosts {
  constructor(private plugin: SocialClientPlugin) {}

  async start() {
    this.plugin.client.pluginEvents.on(
      "/cinderlink/handshake/success",
      async (peer: Peer) => {
        // ask servers for posts since the last saved update + 24 hours
        const since = await this.plugin
          .table<SocialPost>("posts")
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
        await this.plugin.client.send<SocialClientEvents>(
          peer.peerId.toString(),
          {
            topic: "/social/posts/fetch/request",
            payload: {
              requestId: uuid(),
              since,
            },
          }
        );
      }
    );

    const peers = this.plugin.client.peers.getPeers();
    console.info(
      `plugin/social/client > requesting posts (peers)`,
      peers.length
    );
    for (const peer of peers) {
      // since the last saved update + 24 hours
      const since = await this.plugin
        .table<SocialPost>("posts")
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

      await this.plugin.client.send<SocialClientEvents>(
        peer.peerId.toString(),
        {
          topic: "/social/posts/fetch/request",
          payload: {
            requestId: uuid(),
            since,
          },
        }
      );
    }
  }

  async createPost(content: Partial<SocialPost>): Promise<SocialPost> {
    const { id, did, ...post } = content;
    const cid = await this.plugin.client.dag.store(post);
    if (!cid) {
      throw new Error("failed to store post");
    }

    const save = { ...post, cid: cid.toString() };
    const saved = await this.plugin.table<SocialPost>("posts").upsert(
      { cid: cid.toString() },
      {
        ...save,
        did: this.plugin.client.id,
      }
    );

    if (saved === undefined) {
      throw new Error("failed to upsert post");
    }

    // publish the post
    console.info(`plugin/social/client > publishing post`, { post: saved });
    await this.plugin.client.publish("/social/posts/create", saved, {
      sign: true,
      encrypt: false,
    });

    return saved as SocialPost;
  }

  async getUserPosts(did: string): Promise<SocialPost[]> {
    const posts = await this.plugin
      .table<SocialPost>("posts")
      .query()
      .where("did", "=", did)
      .select()
      .execute();

    return posts.all();
  }

  async getLocalUserPosts(): Promise<SocialPost[]> {
    return this.getUserPosts(this.plugin.client.id);
  }

  async onCreate(
    message:
      | IncomingPubsubMessage<SocialClientEvents, "/social/posts/create">
      | IncomingP2PMessage<
          SocialClientEvents,
          "/social/posts/create",
          EncodingOptions
        >
  ) {
    console.info(
      `plugin/social/client > received social update message`,
      message
    );
    const { id, did, cid, ...postData } = message.payload;

    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social update message from unauthorized peer`
      );
      return;
    }

    const user = await this.plugin.users.getUserByDID(did);
    if (!user) {
      console.warn(
        `plugin/social/client > received social update message from unknown user`
      );
      return;
    }
    const saved = await this.plugin.table<SocialPost>("posts").upsert(
      { cid },
      {
        ...postData,
        did,
      }
    );
    console.info(`plugin/social/client > saved post`, saved);
  }

  async onFetchRequest(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/posts/fetch/request",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social updates request message from unauthorized peer`
      );
      return;
    }

    const myPosts = await this.plugin
      .table<SocialPost>("posts")
      .query()
      .where("did", "=", this.plugin.client.id)
      .select()
      .execute()
      .then((result) => result.all());
    console.info(`plugin/social/client > sending updates response`, myPosts);
    await this.plugin.client.send(message.peer.peerId.toString(), {
      topic: "/social/posts/fetch/response",
      payload: {
        requestId: message.payload.requestId,
        updates: myPosts?.map((post) => post) || [],
      },
    });
  }

  async onFetchResponse(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/posts/fetch/response",
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
          const user = did
            ? await this.plugin.users.getUserByDID(did)
            : undefined;
          if (!user) {
            console.warn(
              `plugin/social/client > received social update message from unknown user`
            );
            return;
          }

          const saved = await this.plugin.table<SocialPost>("posts").upsert(
            { cid },
            {
              ...post,
              did,
            }
          );

          console.info(`plugin/social/client > saved post`, saved);
        })
    );
  }
}
