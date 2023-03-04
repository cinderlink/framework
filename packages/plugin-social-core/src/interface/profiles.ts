import { SocialProfile } from "../types";
import SocialClientPluginInterface from "./client-plugin";

export interface SocialProfilesInterface {
  plugin: SocialClientPluginInterface;
  start(): Promise<void>;
  createProfile(
    profileData: Omit<Omit<SocialProfile, "id">, "userId">
  ): Promise<SocialProfile>;
  getUserProfile(userId: number): Promise<SocialProfile | undefined>;
  getLocalProfile(): Promise<SocialProfile | undefined>;
}
