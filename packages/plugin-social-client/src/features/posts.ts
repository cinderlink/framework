import { SocialComment, SocialPost } from "@cinderlink/plugin-social-core";
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
}
