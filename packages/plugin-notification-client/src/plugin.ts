import type {
  PluginInterface,
  CandorClientInterface,
  TableRow,
} from "@candor/core-types";
import { loadNotificationSchema } from "schema";
import { NotificationClientEvents } from "types";
import type { SocialClientEvents } from "@candor/plugin-social-client";
export class NotificationClientPlugin
  implements PluginInterface<NotificationClientEvents>
{
  id = "notificationClient";
  ready = false;
  loggerTag = "plugin/notification/client > ";
  constructor(
    public client: CandorClientInterface<
      NotificationClientEvents | SocialClientEvents
    >,
    public options: Record<string, unknown> = {}
  ) {}

  p2p = {};
  pubsub = {};

  async start() {
    console.info(this.loggerTag, "started");
    await loadNotificationSchema(this.client);

    // listen for incoming events...
    // const socialPlugin =
    //   this.client.getPlugin<SocialClientPlugin>("socialClient");
    const notifications = this.table("notifications")
      .query()
      .select()
      .execute();
    // -----

    console.info(this.loggerTag, "ready");
    this.ready = true;
  }

  get db() {
    const schema = this.client.getSchema("notification");
    if (!schema) {
      throw new Error(`plugin/social/client > failed to get schema`);
    }
    return schema;
  }

  table<Row extends TableRow = TableRow>(name: string) {
    const table = this.db.getTable<Row>(name);
    if (!table) {
      throw new Error(`${this.loggerTag}failed to get table ${name}`);
    }
    return table;
  }

  async stop() {
    console.info(this.loggerTag, "stopped");
  }
}

export default NotificationClientPlugin;
