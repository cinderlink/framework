import { SyncDBPlugin } from "@cinderlink/plugin-sync-db";
import {
  ProtocolEvents,
  ReceiveEventHandlers,
  SchemaInterface,
  SubLoggerInterface,
  SubscribeEventHandlers,
} from "@cinderlink/core-types";
import type {
  PluginInterface,
  CinderlinkClientInterface,
  TableRow,
  TableDefinition,
} from "@cinderlink/core-types";
import Emittery from "emittery";
import {
  SocialClientPluginEvents,
  SocialClientEvents,
  SocialSyncConfig,
} from "@cinderlink/plugin-social-core";
import { loadSocialSchema } from "@cinderlink/plugin-social-core";
import { SocialChat } from "./features/chat";
import { SocialConnections } from "./features/connections";
import { SocialPosts } from "./features/posts";
import { SocialProfiles } from "./features/profiles";
import { SocialUsers } from "./features/users";
import { SocialNotifications } from "./features/notifications";
import { SocialSettings } from "./features/settings";

export class SocialClientPlugin<
    Client extends CinderlinkClientInterface<
      SocialClientEvents & ProtocolEvents
    > = CinderlinkClientInterface<SocialClientEvents & ProtocolEvents>
  >
  extends Emittery<SocialClientPluginEvents>
  implements PluginInterface<SocialClientEvents>
{
  id = "socialClient";
  started = false;

  maxConnectionCount = 256;

  chat: SocialChat;
  connections: SocialConnections;
  posts: SocialPosts;
  profiles: SocialProfiles;
  users: SocialUsers;
  notifications: SocialNotifications;
  settings: SocialSettings;
  logger: SubLoggerInterface;

  pubsub: SubscribeEventHandlers<SocialClientEvents>;
  p2p: ReceiveEventHandlers<SocialClientEvents>;

  constructor(
    public client: Client,
    public options: Record<string, unknown> = {}
  ) {
    super();
    this.logger = client.logger.module("plugins").submodule("socialClient");
    this.notifications = new SocialNotifications(this);
    this.chat = new SocialChat(this);
    this.connections = new SocialConnections(this);
    this.posts = new SocialPosts(this);
    this.profiles = new SocialProfiles(this);
    this.users = new SocialUsers(this);
    this.settings = new SocialSettings(this);

    this.pubsub = {
      "/social/users/announce": this.users.onAnnounce.bind(this.users),
      "/social/posts/create": this.posts.onCreate.bind(this.posts),
      "/social/connections/create": this.connections.onCreate.bind(
        this.connections
      ),
    };

    this.p2p = {
      "/social/users/announce": this.users.onAnnounce.bind(this.users),
      "/social/users/search/response": this.users.onSearchResponse.bind(
        this.users
      ),
      "/social/users/pin/response": this.users.onPinResponse.bind(this.users),
      "/social/users/get/response": this.users.onGetResponse.bind(this.users),
    };
  }

  async start() {
    await loadSocialSchema(this.client);
    this.logger.info(`loaded social schema`);

    this.logger.info(`initializing features`);
    await this.notifications.start();
    await Promise.all([
      this.chat.start(),
      this.connections.start(),
      this.posts.start(),
      this.profiles.start(),
      this.users.start(),
    ]);

    this.logger.info(`registering sync config`);
    const syncDb: SyncDBPlugin = this.client.getPlugin("sync");
    if (syncDb) {
      Object.entries(SocialSyncConfig).map(([table, config]) => {
        syncDb.addTableSync("social", table, config);
      });
    }

    this.started = true;

    this.logger.info(`plugin is ready`);
    this.emit("ready", undefined);
  }

  get db() {
    if (!this.client.hasSchema("social")) {
      this.logger.error(`failed to get schema`);
      throw new Error(`social-client: failed to get schema`);
    }
    return this.client.getSchema("social") as SchemaInterface;
  }

  table<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(name: string) {
    const table = this.db.getTable<Row, Def>(name);
    if (!table) {
      this.logger.error(`failed to get table ${name}`);
      throw new Error(`social-client: failed to get table ${name}`);
    }
    return table;
  }

  async stop() {
    this.logger.info(`stopping`);
    await this.chat.stop();
    await this.connections.stop();
    await this.posts.stop();
    await this.users.stop();
    this.started = false;
  }
}

export default SocialClientPlugin;
