import { SocialProfile } from "@cinderlink/plugin-social-core";
import SocialClientPlugin from "../plugin";

export class SocialProfiles {
  constructor(private plugin: SocialClientPlugin) {}

  async start() {}

  async createProfile(
    profileData: Omit<Omit<SocialProfile, "id">, "userId">
  ): Promise<SocialProfile> {
    const localUserId = await this.plugin.users.getLocalUserId();
    if (localUserId === undefined) {
      throw new Error("failed to get local user id");
    }

    const profile = { ...profileData, userId: localUserId };
    const saved = await this.plugin
      .table<SocialProfile>("profiles")
      .upsert({ userId: localUserId }, profile);

    if (saved === undefined) {
      throw new Error("failed to upsert profile");
    }

    return saved as SocialProfile;
  }

  async getUserProfile(userId: number): Promise<SocialProfile | undefined> {
    const profile = (
      await this.plugin
        .table<SocialProfile>("profiles")
        .query()
        .where("userId", "=", userId)
        .select()
        .execute()
    ).first();

    return profile;
  }

  async getLocalProfile(): Promise<SocialProfile | undefined> {
    const localUserId = await this.plugin.users.getLocalUserId();
    if (localUserId === undefined) {
      throw new Error("failed to get local user id");
    }

    return this.getUserProfile(localUserId);
  }
}
