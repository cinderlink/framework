import { SyncDBPlugin } from "@cinderlink/plugin-sync-db";
import {
  ProtocolEvents,
  ReceiveEventHandlers,
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

const logPurpose = `plugin-social-client`;

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
    public options: Record<string, unknown> = {}
  ) {
    super();
    this.chat = new SocialChat(this);
    this.connections = new SocialConnections(this);
    this.posts = new SocialPosts(this);
    this.profiles = new SocialProfiles(this);
    this.users = new SocialUsers(this);
    this.notifications = new SocialNotifications(this);
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

    this.client.logger.info(logPurpose, "start: starting social client plugin");
    await loadSocialSchema(this.client);
    this.client.logger.info(logPurpose, "start: loaded social schema");
    await this.users.loadLocalUser();
    this.client.logger.info(logPurpose, "start: loaded local user");

    this.client.logger.info(logPurpose, "start: initializing features");
    await this.chat.start();
    await this.connections.start();
    await this.posts.start();
    await this.profiles.start();
    await this.users.start();

    this.ready = true;
    this.client.logger.info(logPurpose, "start: plugin is ready");
    this.emit("ready", undefined);

    this.client.logger.info(logPurpose, "start: registering sync config");
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
      throw new Error(`${logPurpose}: failed to get schema`);
    }
    return schema;
  }

  table<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(name: string) {
    const table = this.db.getTable<Row, Def>(name);
    if (!table) {
      throw new Error(`${logPurpose}: failed to get table ${name}`);
    }
    return table;
  }

  async stop() {
    this.client.logger.info(logPurpose, "stop: stopping social client plugin");
    await this.users.stop();
  }
}

export default SocialClientPlugin;
