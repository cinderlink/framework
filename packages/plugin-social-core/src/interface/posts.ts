import { SocialPost } from "../types";
import SocialClientPluginInterface from "./client-plugin";

export interface SocialPostsInterface {
  plugin: SocialClientPluginInterface;
  start(): Promise<void>;

  createPost(content: Partial<SocialPost>): Promise<SocialPost>;
  getUserPosts(did: string): Promise<SocialPost[]>;
  getLocalUserPosts(): Promise<SocialPost[]>;
}
