import { v4 as uuid } from "uuid";
import {
  EncodingOptions,
  IncomingP2PMessage,
  IncomingPubsubMessage,
  Peer,
} from "@cinderlink/core-types";
import {
  SocialClientEvents,
  SocialComment,
  SocialPost,
} from "@cinderlink/plugin-social-core";
import { OfflineSyncClientPluginInterface } from "@cinderlink/plugin-offline-sync-core";
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

  async getPost(postCid: string) {
    return this.plugin
      .table<SocialPost>("posts")
      .query()
      .where("cid", "=", postCid)
      .select()
      .execute()
      .then((posts) => posts.first());
  }

  async createComment(comment: Partial<SocialComment>): Promise<SocialComment> {
    const { postCid } = comment;
    if (!postCid) {
      throw new Error("postCid is required to create a comment");
    }
    const post = await this.getPost(postCid);
    if (!post) {
      throw new Error("post not found");
    }

    const cid = await this.plugin.client.dag.store(comment);
    if (!cid) {
      throw new Error("failed to store comment");
    }

    const save = {
      ...comment,
      cid: cid.toString(),
      did: comment.did || this.plugin.client.id,
    };
    const saved = await this.plugin.table<SocialComment>("comments").upsert(
      { cid: cid.toString() },
      {
        ...save,
        postCid,
      }
    );

    if (saved === undefined) {
      throw new Error("failed to upsert comment");
    }

    if (saved.did !== this.plugin.client.id) {
      const message = {
        topic: "/social/posts/comments/create",
        payload: saved,
      };
      const author = await this.plugin.client.peers.getPeer(saved.did);
      if (author?.peerId) {
        await this.plugin.client.send(author.peerId.toString(), message as any);
      } else {
        const offlineSyncPlugin = this.plugin.client.getPlugin(
          "offlineSyncClient"
        ) as OfflineSyncClientPluginInterface;
        if (offlineSyncPlugin) {
          await offlineSyncPlugin.sendMessage(saved.did, message);
        }
      }
    }

    return saved as SocialComment;
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

  async onCommentsCreate(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/posts/comments/create",
      EncodingOptions
    >
  ) {
    console.info(
      `plugin/social/client > received social update message`,
      message
    );
    const { postCid, content } = message.payload;

    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social update message from unauthorized peer`
      );
      return;
    }

    const did = message.peer.did;
    const user = await this.plugin.users.getUserByDID(did);
    if (!user) {
      console.warn(
        `plugin/social/client > received social update message from unknown user`
      );
      return;
    }
    const comment = await this.createComment({
      postCid,
      content,
      did,
    });

    console.info(`plugin/social/client > saved comment`, comment);

    await this.plugin.client.send(message.peer.peerId.toString(), {
      topic: "/social/posts/comments/confirm",
      payload: {
        cid: comment.cid,
        success: true,
      },
    });
  }

  async onCommentsFetchRequest(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/posts/comments/fetch/request",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received comments request message from unauthorized peer`
      );
      return;
    }

    const comments = await this.plugin
      .table<SocialComment>("comments")
      .query()
      .where("postCid", "=", message.payload.postCid)
      .select()
      .execute()
      .then((result) => result.all());
    console.info(
      `plugin/social/client > sending comments response`,
      comments,
      message.peer
    );
    await this.plugin.client.send(message.peer.peerId.toString(), {
      topic: "/social/posts/comments/fetch/response",
      payload: {
        requestId: message.payload.requestId,
        updates: comments,
      },
    });
  }

  async onCommentsFetchResponse(
    message: IncomingP2PMessage<
      SocialClientEvents,
      "/social/posts/comments/fetch/response",
      EncodingOptions
    >
  ) {
    if (!message.peer.did) {
      console.warn(
        `plugin/social/client > received social comments response message from unauthorized peer`
      );
      return;
    }

    const updates = message.payload.updates;
    console.info(`plugin/social/client > received comments response`, updates);

    await Promise.all(
      updates
        .filter((post: SocialPost) => post.did !== undefined)
        .map(async ({ postCid, did, cid, ...comment }: SocialComment) => {
          const user = did
            ? await this.plugin.users.getUserByDID(did)
            : undefined;
          if (!user) {
            console.warn(
              `plugin/social/client > received social update message from unknown user`
            );
            return;
          }

          const saved = await this.plugin
            .table<SocialComment>("comments")
            .upsert(
              { cid },
              {
                ...comment,
                did,
              }
            );

          console.info(`plugin/social/client > saved comment`, saved);
        })
    );
  }
}
