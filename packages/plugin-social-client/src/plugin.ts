import {
  PluginEventHandlers,
  ProtocolEvents,
  ReceiveEvents,
  SubscribeEvents,
} from "@candor/core-types";
import type {
  PluginInterface,
  CandorClientInterface,
  TableRow,
  TableDefinition,
} from "@candor/core-types";
import Emittery from "emittery";
import {
  SocialClientPluginEvents,
  SocialClientEvents,
} from "@candor/plugin-social-core";
import { loadSocialSchema } from "@candor/plugin-social-core";
import { SocialChat } from "./features/chat";
import { SocialConnections } from "./features/connections";
import { SocialPosts } from "./features/posts";
import { SocialProfiles } from "./features/profiles";
import { SocialUsers } from "./features/users";

export class SocialClientPlugin<
    Client extends CandorClientInterface<any> = CandorClientInterface<
      SocialClientEvents & ProtocolEvents
    >
  >
  extends Emittery<SocialClientPluginEvents>
  implements PluginInterface<SocialClientEvents, Client>
{
  id = "socialClient";
  ready = false;

  maxConnectionCount = 256;

  chat: SocialChat;
  connections: SocialConnections;
  posts: SocialPosts;
  profiles: SocialProfiles;
  users: SocialUsers;

  pubsub: PluginEventHandlers<SubscribeEvents<SocialClientEvents>>;
  p2p: PluginEventHandlers<ReceiveEvents<SocialClientEvents>>;

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
      "/social/connections/create": this.connections.onCreate.bind(
        this.connections
      ),
      "/social/posts/create": this.posts.onCreate.bind(this.posts),
    };

    this.p2p = {
      "/social/users/announce": this.users.onAnnounce.bind(this.users),
      "/social/users/search/response": this.users.onResponseMessage.bind(
        this.users
      ),
      "/social/users/get/response": this.users.onResponseMessage.bind(
        this.users
      ),
      "/social/connections/create": this.connections.onCreate.bind(
        this.connections
      ),
      "/social/connections/confirm": this.connections.onConfirm.bind(
        this.connections
      ),
      "/social/posts/create": this.posts.onCreate.bind(this.posts),
      "/social/posts/fetch/request": this.posts.onFetchRequest.bind(this.posts),
      "/social/posts/fetch/response": this.posts.onFetchResponse.bind(
        this.posts
      ),
      "/social/chat/message/send": this.chat.onMessageReceived.bind(this.chat),
      "/social/chat/message/confirm": this.chat.onMessageConfirm.bind(
        this.chat
      ),
    };
  }

  async start() {
    console.info(`plugin/social/client > loading schema`);
    await loadSocialSchema(this.client);

    await this.chat.start();
    await this.connections.start();
    await this.posts.start();
    await this.profiles.start();
    await this.users.start();

    this.ready = true;
    console.info(`plugin/social/client > ready`);
    this.emit("ready", undefined);
  }

  get db() {
    const schema = this.client.getSchema("social");
    if (!schema) {
      throw new Error(`plugin/social/client > failed to get schema`);
    }
    return schema;
  }

  table<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(name: string) {
    const table = this.db.getTable<Row, Def>(name);
    if (!table) {
      throw new Error(`plugin/social/client > failed to get table ${name}`);
    }
    return table;
  }

  async stop() {
    console.info(`plugin/social/client > stopping`);
  }
}

export default SocialClientPlugin;
