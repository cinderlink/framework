import { SocialComment, SocialPost } from "../types";
import SocialClientPluginInterface from "./client-plugin";

export interface SocialPostsInterface {
  plugin: SocialClientPluginInterface;
  start(): Promise<void>;

  createPost(post: Omit<Omit<SocialPost, "id">, "uid">): Promise<SocialPost>;
  createComment(comment: Partial<SocialComment>): Promise<SocialComment>;

  getUserPosts(did: string): Promise<SocialPost[]>;
  getLocalUserPosts(): Promise<SocialPost[]>;
}
