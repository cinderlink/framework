import Emittery from "emittery";
import {
  CinderlinkClientInterface,
  PluginEventHandlers,
  PluginInterface,
  ProtocolEvents,
  ReceiveEvents,
  SchemaInterface,
  SubscribeEvents,
  TableDefinition,
  TableInterface,
  TableRow,
} from "@cinderlink/core-types";
import { SocialClientEvents, SocialClientPluginEvents } from "../types";
import { SocialChatInterface } from "./chat";
import { SocialConnectionsInterface } from "./connections";
import { SocialPostsInterface } from "./posts";
import { SocialProfilesInterface } from "./profiles";
import { SocialUsersInterface } from "./users";

export interface SocialClientPluginInterface
  extends Emittery<SocialClientPluginEvents>,
    PluginInterface<SocialClientEvents, ProtocolEvents> {
  id: "socialClient";
  ready: boolean;
  maxConnectionCount: number;

  chat: SocialChatInterface;
  connections: SocialConnectionsInterface;
  posts: SocialPostsInterface;
  profiles: SocialProfilesInterface;
  users: SocialUsersInterface;

  pubsub: PluginEventHandlers<SubscribeEvents<SocialClientEvents>>;
  p2p: PluginEventHandlers<ReceiveEvents<SocialClientEvents>>;

  db: SchemaInterface;
  client: CinderlinkClientInterface;
  options: Record<string, unknown>;

  start(): Promise<void>;

  table<
    Row extends TableRow = TableRow,
    Def extends TableDefinition<Row> = TableDefinition<Row>
  >(
    name: string
  ): TableInterface<Row, Def>;

  stop(): Promise<void>;
}

export default SocialClientPluginInterface;
