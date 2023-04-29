import { SyncDBPlugin } from "@cinderlink/plugin-sync-db";
import {
  ProtocolEvents,
  ReceiveEventHandlers,
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
  ready = false;

  maxConnectionCount = 256;

  chat: SocialChat;
  connections: SocialConnections;
  posts: SocialPosts;
  profiles: SocialProfiles;
  users: SocialUsers;
  notifications: SocialNotifications;
  settings: SocialSettings;

  pubsub: SubscribeEventHandlers<SocialClientEvents>;
  p2p: ReceiveEventHandlers<SocialClientEvents>;

  constructor(
    public client: Client,
    public options: Record<string, unknown> = {},
    public logger: SubLoggerInterface
  ) {
    super();
    this.chat = new SocialChat(
      this,
      client.logger.module("plugins").submodule("social-chat")
    );
    this.connections = new SocialConnections(
      this,
      client.logger.module("plugins").submodule("social-connections")
    );
    this.posts = new SocialPosts(
      this,
      client.logger.module("plugins").submodule("social-posts")
    );
    this.profiles = new SocialProfiles(this);
    this.users = new SocialUsers(
      this,
      client.logger.module("plugins").submodule("social-users")
    );
    this.notifications = new SocialNotifications(
      this,
      client.logger.module("plugins").submodule("social-notifications")
    );
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
    if (!this.client.identity.hasResolved) {
      await this.client.identity.resolve();
    }

    this.logger.info(`start: starting social client plugin`);
    await loadSocialSchema(this.client);
    this.logger.info(`start: start: loaded social schema`);
    await this.users.loadLocalUser();

    this.logger.info(`start: loaded local user`);
    this.logger.info(`start: initializing features`);
    await this.chat.start();
    await this.connections.start();
    await this.posts.start();
    await this.profiles.start();
    await this.users.start();

    this.ready = true;

    this.logger.info(`start: plugin is ready`);
    this.emit("ready", undefined);

    this.logger.info(`start: registering sync config`);
    const syncDb: SyncDBPlugin = this.client.getPlugin("sync");
    if (syncDb) {
      Object.entries(SocialSyncConfig).map(([table, config]) => {
        syncDb.addTableSync("social", table, config);
      });
    }
  }

  get db() {
    const schema = this.client.getSchema("social");
    if (!schema) {
      throw new Error(`social-client: failed to get schema`);
    }
    return schema;
  }

  table<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(name: string) {
    const table = this.db.getTable<Row, Def>(name);
    if (!table) {
      throw new Error(`social-client: failed to get table ${name}`);
    }
    return table;
  }

  async stop() {
    this.logger.info(`stop: stopping social client plugin`);
    await this.users.stop();
  }
}

export default SocialClientPlugin;
