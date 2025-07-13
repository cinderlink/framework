import { SocialProfile } from "@cinderlink/plugin-social-core";
import SocialClientPlugin from "../plugin";

export class SocialProfiles {
  constructor(private plugin: SocialClientPlugin) {}

  start() {}

  async createProfile(
    profileData: Omit<SocialProfile, "id">
  ): Promise<SocialProfile> {
    const userUid = await this.plugin.users.getLocalUserUid();
    if (userUid === undefined) {
      throw new Error("failed to get local user id");
    }

    const profile = { ...profileData, userUid };
    const saved = await this.plugin
      .table<SocialProfile>("profiles")
      .upsert({ userUid }, profile);

    if (saved === undefined) {
      throw new Error("failed to upsert profile");
    }

    return saved as SocialProfile;
  }

  async getUserProfile(uid: string): Promise<SocialProfile | undefined> {
    const profile = (
      await this.plugin
        .table<SocialProfile>("profiles")
        .query()
        .where("userUid", "=", uid)
        .select()
        .execute()
    ).first();

    return profile;
  }

  async getLocalProfile(): Promise<SocialProfile | undefined> {
    const userUid = await this.plugin.users.getLocalUserUid();
    if (userUid === undefined) {
      throw new Error("failed to get local user id");
    }

    return this.getUserProfile(userUid);
  }
}
