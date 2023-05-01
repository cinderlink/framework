import SocialClientPlugin from "../plugin";
import {
  SocialNotification,
  SocialNotificationType,
} from "@cinderlink/plugin-social-core";
import {
  SubLoggerInterface,
  TableInterface,
  TableRow,
} from "@cinderlink/core-types";

export type NotificationGeneratorFn<Row extends TableRow = TableRow> = (
  row: Row
) => Promise<SocialNotification | undefined>;

export interface NotificationGenerator<Row extends TableRow = TableRow> {
  id: string;
  schemaId: string;
  tableId: string;
  enabled: boolean;
  insert?: NotificationGeneratorFn<Row>;
  update?: NotificationGeneratorFn<Row>;
  delete?: NotificationGeneratorFn<Row>;
}

export class SocialNotifications {
  _table?: TableInterface<SocialNotification>;
  logger: SubLoggerInterface;
  generators: Map<string, NotificationGenerator<any>> = new Map();

  constructor(public plugin: SocialClientPlugin) {
    this.logger = plugin.logger.submodule("notifications");
  }

  addGenerator<Row extends TableRow = TableRow>(
    generator: NotificationGenerator<Row>
  ) {
    this.generators.set(generator.id, generator);
    this.bindGenerator(generator);
  }

  bindGenerator<Row extends TableRow = TableRow>(
    generator: NotificationGenerator<Row>
  ) {
    const schema = this.plugin.client.getSchema(generator.schemaId);
    if (!schema) {
      this.logger.error(`schema not found`, { schemaId: generator.schemaId });
      return;
    }

    const table = schema.getTable<Row>(generator.tableId);
    if (!table) {
      this.logger.error(`table not found`, {
        schemaId: generator.schemaId,
        tableId: generator.tableId,
      });
      return;
    }

    if (generator.insert) {
      table.on(
        "/record/inserted",
        this.handleGeneratorListener<Row>(generator.insert)
      );
    }

    if (generator.update) {
      table.on(
        "/record/updated",
        this.handleGeneratorListener<Row>(generator.update)
      );
    }

    if (generator.delete) {
      table.on(
        "/record/deleted",
        this.handleGeneratorListener<Row>(generator.delete)
      );
    }
  }

  unbindGenerator<Row extends TableRow = TableRow>(
    generator: NotificationGenerator<Row>
  ) {
    const schema = this.plugin.client.getSchema(generator.schemaId);
    if (!schema) {
      this.logger.error(`schema not found`, { schemaId: generator.schemaId });
      return;
    }

    const table = schema.getTable<Row>(generator.tableId);
    if (!table) {
      this.logger.error(`table not found`, {
        schemaId: generator.schemaId,
        tableId: generator.tableId,
      });
      return;
    }

    if (generator.insert) {
      table.off(
        "/record/inserted",
        this.handleGeneratorListener<Row>(generator.insert)
      );
    }

    if (generator.update) {
      table.off(
        "/record/updated",
        this.handleGeneratorListener<Row>(generator.update)
      );
    }

    if (generator.delete) {
      table.off(
        "/record/deleted",
        this.handleGeneratorListener<Row>(generator.delete)
      );
    }
  }

  handleGeneratorListener<Row extends TableRow = TableRow>(
    fn: NotificationGeneratorFn<Row>
  ) {
    return async (record: Row): Promise<void> => {
      try {
        const notification = await fn(record);
        if (!notification) return;

        await this.create(notification);
      } catch (err) {
        // handle error
      }
    };
  }

  enableGenerator(id: string) {
    const generator = this.generators.get(id);
    if (!generator) {
      this.logger.warn(`generator not found`, { id });
      return;
    }

    generator.enabled = true;
    this.bindGenerator(generator);
  }

  disableGenerator(id: string) {
    const generator = this.generators.get(id);
    if (!generator) {
      this.logger.warn(`generator not found`, { id });
      return;
    }

    generator.enabled = false;
    this.unbindGenerator(generator);
  }

  async start() {
    this._table = this.plugin.table("notifications");
  }

  async stop() {
    this.generators.forEach((generator) => {
      if (generator.enabled) {
        this.unbindGenerator(generator);
      }
    });
  }

  get table() {
    if (!this._table) {
      throw new Error("notifications table not loaded");
    }
    return this._table;
  }

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
          this.logger.info(`browser permissions granted`);
        }
      });
    }
  }

  showBrowserNotification(
    notification: SocialNotification,
    options: NotificationOptions
  ) {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }
    if (Notification.permission === "granted") {
      const browserNotification = new Notification(notification.title, options);
      browserNotification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        this.plugin.emit("/notification/clicked", { notification, options });
        browserNotification.close();
      };
    }
  }

  async create(
    notification: Omit<Omit<SocialNotification, "id">, "uid">,
    options?: NotificationOptions
  ): Promise<SocialNotification | undefined> {
    const saved = await this.table.upsert(
      {
        type: notification.type,
        sourceUid: notification.sourceUid,
      },
      { ...notification, dismissed: false, createdAt: Date.now(), read: false }
    );
    if (options) {
      this.showBrowserNotification(saved, options);
    }
    return saved;
  }

  async getAll(): Promise<SocialNotification[] | []> {
    const notifications = await this.table
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
    const notifications = await this.table
      .query()
      .where("type", "=", type)
      .where("dismissed", "=", false)
      .select()
      .execute()
      .then((res) => res.all());
    return notifications;
  }

  async getBySource(sourceUid: string): Promise<SocialNotification[] | []> {
    const notifications = await this.table
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
    const notification = await this.table
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
    const notification = await this.table
      .query()
      .where("uid", "=", uid)
      .select()
      .execute()
      .then((res) => res.first());
    return notification;
  }

  async dismissByUid(uid: string): Promise<SocialNotification> {
    const notification = await this.table.getByUid(uid);
    if (!notification) {
      throw new Error("notification not found");
    }
    const updated = await this.table.update(uid, {
      dismissed: true,
    });
    return updated;
  }

  async dismissAll(): Promise<SocialNotification[]> {
    const updated = await this.table
      .query()
      .update({ dismissed: true })
      .where("dismissed", "=", false)
      .returning()
      .execute()
      .then((r) => r.all());
    return updated;
  }

  async readAll(): Promise<SocialNotification[]> {
    const updated = await this.table
      .query()
      .update({ read: true })
      .where("read", "=", false)
      .returning()
      .execute()
      .then((r) => r.all());
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
