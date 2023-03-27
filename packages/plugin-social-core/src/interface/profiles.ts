import { SocialProfile } from "../types";
import SocialClientPluginInterface from "./client-plugin";

export interface SocialProfilesInterface {
  plugin: SocialClientPluginInterface;
  start(): Promise<void>;
  createProfile(
    profileData: Omit<Omit<SocialProfile, "id">, "userUid">
  ): Promise<SocialProfile>;
  getUserProfile(uid: string): Promise<SocialProfile | undefined>;
  getLocalProfile(): Promise<SocialProfile | undefined>;
}
