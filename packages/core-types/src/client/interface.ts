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
import { CandorClientEvents } from "./types";

export interface CandorClientInterface<
  PluginEvents extends PluginEventDef = {
    send: {};
    receive: {};
    emit: {};
    publish: {};
    subscribe: {};
  }
> extends Emittery<CandorClientEvents["emit"] & ProtocolEvents["emit"]> {
  plugins: Record<PluginInterface["id"], PluginInterface<any>>;
  started: boolean;
  hasServerConnection: boolean;
  peers: PeerStoreInterface;
  subscriptions: string[];
  relayAddresses: string[];

  pubsub: Emittery<SubscribeEvents<PluginEvents>>;
  p2p: Emittery<ReceiveEvents<PluginEvents>>;

  ipfs: IPFSWithLibP2P;
  did: DID;
  peerId?: PeerId;
  dag: DIDDagInterface;
  schemas: Record<string, SchemaInterface>;
  identity: IdentityInterface;

  get id(): string;

  addPlugin<
    Events extends PluginEventDef = PluginEventDef,
    Plugin extends PluginInterface<Events> = PluginInterface<Events>
  >(
    plugin: Plugin
  ): Promise<void>;

  getPlugin<
    E extends PluginEventDef = PluginEventDef,
    T extends PluginInterface<E> = PluginInterface<E>
  >(
    id: string
  ): T;

  hasPlugin(id: string): boolean;

  start(): Promise<void>;
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
    Encoding extends EncodingOptions = EncodingOptions,
    Events extends PluginEventDef = PluginEvents,
    OutTopic extends keyof Events["send"] = keyof Events["send"],
    InTopic extends keyof Events["receive"] = keyof Events["receive"]
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
