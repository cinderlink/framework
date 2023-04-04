import SocialClientPlugin from "../plugin";
import {
  SocialNotification,
  SocialNotificationType,
} from "@cinderlink/plugin-social-core";
export class SocialNotifications {
  constructor(private plugin: SocialClientPlugin) {}

  async start() {}

  async create(
    notification: Omit<Omit<SocialNotification, "id">, "uid">
  ): Promise<SocialNotification | undefined> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const saved = await table.upsert(
      {
        type: notification.type,
        source: notification.source,
      },
      notification
    );
    return saved;
  }

  async getAll(): Promise<SocialNotification[] | []> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notifications = await table
      .query()
      .select()
      .execute()
      .then((res) => res.all());
    return notifications;
  }

  async getByType(
    type: SocialNotificationType
  ): Promise<SocialNotification[] | []> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notifications = await table
      .query()
      .where("type", "=", type)
      .where("dismissed", "=", false)
      .select()
      .execute()
      .then((res) => res.all());
    return notifications;
  }

  async getBySource(source: string): Promise<SocialNotification[] | []> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notifications = await table
      .query()
      .where("source", "=", source)
      .where("dismissed", "=", false)
      .select()
      .execute()
      .then((res) => res.all());
    return notifications;
  }

  async get(uid: string): Promise<SocialNotification | undefined> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notification = await table
      .query()
      .where("uid", "=", uid)
      .select()
      .execute()
      .then((res) => res.first());
    return notification;
  }

  async dismissByUid(uid: string): Promise<SocialNotification> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notification = await table.getByUid(uid);
    if (!notification) {
      throw new Error("notification not found");
    }
    const updated = await table.update(uid, {
      dismissed: true,
    });
    return updated;
  }

  async dismissAll(): Promise<SocialNotification[]> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notifications = await table
      .query()
      .where("dismissed", "=", false)
      .select()
      .execute()
      .then((res) => res.all());
    const updated = await Promise.all(
      notifications.map((n) => table.update(n.uid, { dismissed: true }))
    );
    return updated;
  }
}
