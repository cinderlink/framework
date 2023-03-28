import {
  SocialComment,
  SocialPost,
  SocialReaction,
} from "@cinderlink/plugin-social-core";
import { OfflineSyncClientPluginInterface } from "@cinderlink/plugin-offline-sync-core";
import SocialClientPlugin from "../plugin";

export class SocialPosts {
  constructor(private plugin: SocialClientPlugin) {}

  async start() {}

  async createPost(
    post: Omit<Omit<SocialPost, "id">, "uid">
  ): Promise<SocialPost> {
    const cid = await this.plugin.client.dag.store(post);
    if (!cid) {
      throw new Error("failed to store post");
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
    console.info(`plugin/social/client > publishing post`, { post: saved });
    await this.plugin.client.publish("/social/posts/create", saved, {
      sign: true,
      encrypt: false,
    });

    return saved as SocialPost;
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
      throw new Error("postUid is required to create a comment");
    }
    const post = await this.getPost(postUid);
    if (!post) {
      throw new Error("post not found: " + postUid);
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
        postUid,
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
