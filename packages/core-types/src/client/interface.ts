import type Emittery from "emittery";
import type { PluginInterface, PluginEventDef } from "../plugin/types";
import type {
  IncomingP2PMessage,
  OutgoingP2PMessage,
  PeerRole,
  PeerStoreInterface,
  ReceiveEvents,
} from "../p2p";
import type { IPFSWithLibP2P } from "../ipfs";
import type { DID } from "dids";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { DIDDagInterface } from "../dag";
import type { IdentityInterface } from "../identity";
import { SchemaInterface } from "../database/schema";
import { SubscribeEvents } from "../pubsub";
import { EncodingOptions, ProtocolEvents } from "../protocol";
import { CinderlinkClientEvents } from "./types";
import { FilesInterface } from "../files/interface";

export interface CinderlinkClientInterface<
  PluginEvents extends PluginEventDef = {
    send: {};
    receive: {};
    publish: {};
    subscribe: {};
    emit: {};
  }
> extends Emittery<CinderlinkClientEvents["emit"] & ProtocolEvents["emit"]> {
  plugins: Record<PluginInterface["id"], PluginInterface<any>>;
  running: boolean;
  hasServerConnection: boolean;
  peers: PeerStoreInterface;
  subscriptions: string[];
  relayAddresses: string[];
  pluginEvents: Emittery<PluginEvents["emit"]>;

  pubsub: Emittery<SubscribeEvents<PluginEvents>>;
  p2p: Emittery<ReceiveEvents<PluginEvents>>;

  ipfs: IPFSWithLibP2P;
  files: FilesInterface;
  did: DID;
  address: string;
  addressVerification: string;
  peerId?: PeerId;
  dag: DIDDagInterface;
  schemas: Record<string, SchemaInterface>;
  identity: IdentityInterface;
  initialConnectTimeout: number;

  get id(): string;

  addPlugin(plugin: PluginInterface<any, any>): Promise<void>;

  getPlugin<T extends PluginInterface<any, any> = PluginInterface<any, any>>(
    id: string
  ): T;

  hasPlugin(id: string): boolean;

  start(connectTo: string[]): Promise<void>;
  stop(): Promise<void>;
  save(): Promise<void>;
  load(): Promise<void>;
  connect(peerId: PeerId, role?: PeerRole): Promise<void>;

  send<
    Events extends PluginEventDef = PluginEvents,
    Topic extends keyof Events["send"] = keyof Events["send"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    peerId: string,
    message: OutgoingP2PMessage<Events, Topic, Encoding>,
    options?: Encoding
  ): Promise<void>;

  request<
    Events extends PluginEventDef = PluginEvents,
    OutTopic extends keyof Events["send"] = keyof Events["send"],
    InTopic extends keyof Events["receive"] = keyof Events["receive"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    peerId: string,
    message: OutgoingP2PMessage<Events, OutTopic, Encoding>,
    options?: Encoding
  ): Promise<IncomingP2PMessage<Events, InTopic, Encoding> | undefined>;

  subscribe(topic: keyof PluginEvents["subscribe"]): Promise<void>;

  unsubscribe(topic: keyof PluginEvents["subscribe"]): Promise<void>;

  publish<
    Topic extends keyof PluginEvents["publish"] = keyof PluginEvents["publish"]
  >(
    topic: Topic,
    message: PluginEvents["publish"][Topic],
    options?: EncodingOptions
  ): Promise<void>;

  hasSchema(name: string): boolean;
  getSchema(name: string): SchemaInterface | undefined;
  addSchema(name: string, schema: SchemaInterface): Promise<void>;
}
