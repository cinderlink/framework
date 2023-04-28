import SocialClientPlugin from "../plugin";
import {
  SocialNotification,
  SocialNotificationType,
} from "@cinderlink/plugin-social-core";
import { Operation } from "@cinderlink/core-types";
const logModule = "plugins";
const pluginName = "social-client";
export class SocialNotifications {
  constructor(private plugin: SocialClientPlugin) {}

  async start() {}

  askForBrowserPermission() {
    if (!("Notification" in window)) {
      return;
    }
    if (Notification.permission === "granted") {
      return;
    }
    if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          this.plugin.client.logger.info(
            logModule,
            `${pluginName}/askForBrowserPermission: permission granted`
          );
        }
      });
    }
  }

  async create(
    notification: Omit<Omit<SocialNotification, "id">, "uid">
  ): Promise<SocialNotification | undefined> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const saved = await table.upsert(
      {
        type: notification.type,
        sourceUid: notification.sourceUid,
      },
      { ...notification, dismissed: false, createdAt: Date.now(), read: false }
    );
    return saved;
  }

  async getAll(): Promise<SocialNotification[] | []> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notifications = await table
      .query()
      .orderBy("createdAt", "desc")
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

  async getWhere(
    key: keyof SocialNotification,
    operator: Operation,
    value: any
  ): Promise<SocialNotification[] | []> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notifications = await table
      .query()
      .where(key, operator, value)
      .where("dismissed", "=", false)
      .select()
      .execute()
      .then((res) => res.all());
    return notifications;
  }

  async getBySource(sourceUid: string): Promise<SocialNotification[] | []> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notifications = await table
      .query()
      .where("sourceUid", "=", sourceUid)
      .where("dismissed", "=", false)
      .select()
      .execute()
      .then((res) => res.all());
    return notifications;
  }

  async getBySourceAndType(
    sourceUid: string,
    type: SocialNotificationType
  ): Promise<SocialNotification> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notification = await table
      .query()
      .where("sourceUid", "=", sourceUid)
      .where("type", "=", type)
      .where("dismissed", "=", false)
      .select()
      .execute()
      .then((res) => res.first());
    return notification;
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
  async readAll(): Promise<SocialNotification[]> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notifications = await table
      .query()
      .where("read", "=", false)
      .select()
      .execute()
      .then((res) => res.all());
    const updated = await Promise.all(
      notifications.map((n) => table.update(n.uid, { read: true }))
    );
    return updated;
  }
  async readByUid(uid: string): Promise<SocialNotification> {
    const table = await this.plugin.table<SocialNotification>("notifications");
    const notification = await table.getByUid(uid);
    if (!notification) {
      throw new Error("notification not found");
    }
    const updated = await table.update(uid, {
      read: true,
    });
    return updated;
  }
}
