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

const logPrefix = `plugin/social/client`;

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

    this.pubsub = {
      "/social/users/announce": this.users.onAnnounce.bind(this.users),
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

    console.info(`${logPrefix} > loading schema`);
    await loadSocialSchema(this.client);
    await this.users.loadLocalUser();

    console.info(`${logPrefix} > initializing features`);
    await this.chat.start();
    await this.connections.start();
    await this.posts.start();
    await this.profiles.start();
    await this.users.start();

    this.ready = true;
    console.info(`${logPrefix} > ready`);
    this.emit("ready", undefined);

    console.info(`${logPrefix} > registering sync config`);
    const syncDb: SyncDBPlugin = this.client.getPlugin("sync") as any;
    if (syncDb) {
      Object.entries(SocialSyncConfig).map(([table, config]) => {
        syncDb.addTableSync("social", table, config);
      });
    }
  }

  get db() {
    const schema = this.client.getSchema("social");
    if (!schema) {
      throw new Error(`${logPrefix} > failed to get schema`);
    }
    return schema;
  }

  table<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(name: string) {
    const table = this.db.getTable<Row, Def>(name);
    if (!table) {
      throw new Error(`${logPrefix} > failed to get table ${name}`);
    }
    return table;
  }

  async stop() {
    console.info(`${logPrefix} > stopping`);
    await this.users.stop();
  }
}

export default SocialClientPlugin;
