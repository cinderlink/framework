import {
  SocialClientEvents,
  SocialComment,
  SocialPost,
  SocialReaction,
} from "@cinderlink/plugin-social-core";
import { OfflineSyncClientPluginInterface } from "@cinderlink/plugin-offline-sync-core";
import SocialClientPlugin from "../plugin";
import {
  IncomingPubsubMessage,
  SubLoggerInterface,
} from "@cinderlink/core-types";
import { NotificationGenerator, SocialNotifications } from "./notifications";
export class SocialPosts {
  logger: SubLoggerInterface;
  constructor(private plugin: SocialClientPlugin) {
    this.logger = plugin.logger.submodule("posts");
  }

  async start() {
    this.plugin.notifications.addGenerator<SocialPost>({
      id: "social/posts",
      schemaId: "social",
      tableId: "posts",
      enabled: true,
      async insert(this: SocialNotifications, post: SocialPost) {
        if (post?.did === this.plugin.client?.id) return;
        const user = await this.plugin.users.getUserByDID(post.did);
        const title = "New post";
        const body = `
${user?.name}
${post.content}
`;
        return {
          sourceUid: post.uid,
          type: "posts/new",
          title,
          body,
          link: "/feed",
          metaData: { did: post.did },
        };
      },
    } as NotificationGenerator<SocialPost>);
  }

  async stop() {
    this.plugin.notifications.disableGenerator("social/posts");
  }

  async createPost(
    post: Omit<Omit<Omit<Omit<SocialPost, "id">, "uid">, "cid">, "did">
  ): Promise<SocialPost> {
    this.logger.info(`creating post`, { post });
    const cid = await this.plugin.client.dag.store(post);
    if (!cid) {
      this.logger.error(`failed to store post`, { post });
      throw new Error(`social-posts: failed to store post`);
    }

    const table = this.plugin.table<SocialPost>("posts");
    const save = { ...post, cid: cid.toString() };
    const savedId = await table.insert({
      ...save,
      did: this.plugin.client.id,
    });
    const saved = await table.getByUid(savedId);

    if (saved === undefined) {
      throw new Error("failed to upsert post");
    }

    // publish the post
    this.logger.debug(`publishing post`, { post: saved });
    await this.plugin.client
      .publish("/social/posts/create", saved, {
        sign: true,
        encrypt: false,
      })
      .catch(() => {});

    return saved as SocialPost;
  }

  async onCreate(
    message: IncomingPubsubMessage<SocialClientEvents, "/social/posts/create">
  ) {
    this.logger.debug("received post pubsub", { message });
    // TODO: save the post
  }

  async getPost(postUid: string) {
    return this.plugin
      .table<SocialPost>("posts")
      .query()
      .where("uid", "=", postUid)
      .select()
      .execute()
      .then((posts) => posts.first());
  }

  async createComment(comment: Partial<SocialComment>): Promise<SocialComment> {
    const { postUid } = comment;
    if (!postUid) {
      this.logger.error(`postUid is required to create a comment`, { comment });
      throw new Error("postUid is required to create a comment");
    }
    const post = await this.getPost(postUid);
    if (!post) {
      this.logger.error(`post not found: ${postUid}`, { comment });
      throw new Error("post not found: " + postUid);
    }

    const cid = await this.plugin.client.dag.store(comment);
    if (!cid) {
      this.logger.error(`failed to store comment`, { comment });
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
        postUid,
      }
    );

    if (saved === undefined) {
      this.logger.error(`failed to upsert comment`, { comment });
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

  async getPostComments(postUid: string): Promise<SocialComment[]> {
    const comments = await this.plugin
      .table<SocialComment>("comments")
      .query()
      .where("postUid", "=", postUid)
      .select()
      .execute();

    return comments.all();
  }

  async getLocalUserPosts(): Promise<SocialPost[]> {
    return this.getUserPosts(this.plugin.client.id);
  }

  async createReaction(
    reaction: Partial<SocialReaction>
  ): Promise<SocialReaction> {
    const { postUid, from, type, commentUid } = reaction;
    if (!postUid) {
      throw new Error("postUid is required to create a reaction");
    }
    if (!from) {
      throw new Error("from is required to create a reaction");
    }
    if (!type) {
      throw new Error("type is required to create a reaction");
    }

    const save = {
      ...reaction,
      from: reaction.from || this.plugin.client.id,
    };

    const saved = await this.plugin.table<SocialReaction>("reactions").upsert(
      { postUid, from, commentUid } as {
        postUid: string;
        from: string;
        commentUid: string;
      },
      {
        ...save,
      }
    );

    if (saved === undefined) {
      throw new Error("failed to upsert reaction");
    }

    return saved;
  }

  async deleteReaction(
    reaction: Partial<SocialReaction>
  ): Promise<SocialReaction> {
    const { postUid, from, type, commentUid } = reaction;
    if (!postUid) {
      this.logger.error(`postUid is required to delete a reaction`, {
        reaction,
      });
      throw new Error("postUid is required to delete a reaction");
    }

    const deleted = await this.plugin
      .table<SocialReaction>("reactions")
      .query()
      .where("from", "=", from as string)
      .where("postUid", "=", postUid)
      .where("commentUid", "=", commentUid as string)
      .where("type", "=", type as "post" | "comment")
      .returning()
      .delete()
      .execute()
      .then((res) => res.first());

    return deleted;
  }
}
