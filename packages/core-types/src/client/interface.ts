import type Emittery from "emittery";
import type {
  PluginInterface,
  PluginEventDef,
  PluginBaseInterface,
} from "../plugin/types";
import type {
  IncomingP2PMessage,
  OutgoingP2PMessage,
  PeerRole,
  PeerStoreInterface,
  ReceiveEvents,
} from "../p2p";
import type { IPFSWithLibP2P } from "../ipfs";
import type { DID } from "dids";
import type { PeerId } from "@libp2p/interface";
import type { DIDDagInterface } from "../dag";
import type { IdentityInterface } from "../identity";
import { SchemaInterface } from "../database/schema";
import { SubscribeEvents } from "../pubsub";
import { EncodingOptions, ProtocolEvents } from "../protocol";
import { CinderlinkClientEvents } from "./types";
import { FilesInterface } from "../files/interface";
import { LoggerInterface } from "../logger";

export interface CinderlinkClientInterface<
  PluginEvents extends PluginEventDef = {
    send: {};
    receive: {};
    publish: {};
    subscribe: {};
    emit: {};
  }
> extends Emittery<CinderlinkClientEvents["emit"] & ProtocolEvents["emit"]> {
  plugins: Record<PluginInterface["id"], PluginInterface>;
  running: boolean;
  hasServerConnection: boolean;
  peers: PeerStoreInterface;
  subscriptions: string[];
  relayAddresses: string[];
  pluginEvents: Emittery<PluginEvents["emit"]>;
  logger: LoggerInterface;

  pubsub: Emittery<SubscribeEvents<PluginEvents>>;
  p2p: Emittery<ReceiveEvents<PluginEvents & CinderlinkClientEvents>>;

  ipfs: IPFSWithLibP2P;
  files: FilesInterface;
  did: DID;
  address: `0x${string}`;
  addressVerification: string;
  peerId?: PeerId;
  dag: DIDDagInterface;
  schemas: Record<string, SchemaInterface>;
  identity: IdentityInterface;
  initialConnectTimeout: number;
  keepAliveTimeout: number;
  keepAliveInterval: number;

  get id(): string;

  addPlugin<T extends PluginBaseInterface>(plugin: T): Promise<void>;

  getPlugin<T extends PluginBaseInterface>(id: string): T;

  hasPlugin(id: string): boolean;

  start(connectTo: string[]): Promise<void>;
  stop(): Promise<void>;
  save(forceRemote?: boolean, forceImmediate?: boolean): Promise<void>;
  load(): Promise<void>;
  connect(peerId: PeerId, role?: PeerRole): Promise<void>;

  send<
    Events extends PluginEventDef = PluginEvents,
    Topic extends keyof Events["send"] = keyof Events["send"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    peerId: string,
    message: OutgoingP2PMessage<Events, Topic>,
    encoding?: Encoding,
    options?: { retries?: number; retryDelay?: number; offline?: boolean }
  ): Promise<void>;

  request<
    Events extends PluginEventDef = PluginEvents,
    OutTopic extends keyof Events["send"] = keyof Events["send"],
    InTopic extends keyof Events["receive"] = keyof Events["receive"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    peerId: string,
    message: OutgoingP2PMessage<Events, OutTopic>,
    options?: Encoding
  ): Promise<IncomingP2PMessage<Events, InTopic, Encoding> | undefined>;

  subscribe(topic: keyof PluginEvents["subscribe"]): Promise<void>;

  unsubscribe(topic: keyof PluginEvents["subscribe"]): Promise<void>;

  publish<
    Events extends PluginEventDef = PluginEvents,
    Topic extends keyof Events["publish"] = keyof Events["publish"]
  >(
    topic: Topic,
    message: Events["publish"][Topic],
    options?: EncodingOptions
  ): Promise<void>;

  hasSchema(name: string): boolean;
  getSchema(name: string): SchemaInterface | undefined;
  addSchema(name: string, schema: SchemaInterface): Promise<void>;
}
