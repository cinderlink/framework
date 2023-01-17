import type Emittery from "emittery";
import type { PluginInterface, PluginEventDef } from "../plugin/types";
import type { CandorClientEvents } from "./types";
import type { PeerStoreInterface } from "../p2p";
import type { PubsubMessageEvents } from "../pubsub";
import type { IPFSWithLibP2P } from "../ipfs";
import type { DID } from "dids";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { DIDDagInterface } from "../dag";
import type { IdentityInterface } from "../identity";
import { SchemaInterface } from "../database/schema";
export interface CandorClientInterface<
  PluginEvents extends PluginEventDef = PluginEventDef,
  EmitEvents extends PluginEvents["emit"] &
    CandorClientEvents = PluginEvents["emit"] & CandorClientEvents
> extends Emittery<EmitEvents> {
  plugins: Record<PluginInterface["id"], PluginInterface<PluginEvents>>;
  started: boolean;
  hasServerConnection: boolean;
  peers: PeerStoreInterface;
  subscriptions: string[];

  pubsub: Emittery<PubsubMessageEvents<PluginEvents["subscribe"]>>;
  p2p: Emittery<PluginEvents["receive"]>;

  ipfs: IPFSWithLibP2P;
  did: DID;
  peerId?: PeerId;
  dag: DIDDagInterface;
  schemas: Record<string, SchemaInterface>;
  identity: IdentityInterface;
  p2pStreams: Record<string, any>;

  get id(): string;

  addPlugin(plugin: PluginInterface<any>): Promise<void>;

  start(): Promise<void>;
  stop(): Promise<void>;
  save(): Promise<void>;
  load(): Promise<void>;
  connect(peerId: PeerId): Promise<void>;

  send(did: string, message: unknown): Promise<void>;
  streamToEmitter(stream: any): Promise<void>;

  subscribe(topic: keyof PluginEvents["subscribe"]): Promise<void>;
  unsubscribe(topic: keyof PluginEvents["subscribe"]): Promise<void>;
  publish<
    K extends keyof PluginEvents["publish"] = keyof PluginEvents["publish"]
  >(
    topic: K,
    message: PluginEvents["publish"][K]
  ): Promise<void>;
  onMessage(message: any): Promise<void>;

  hasSchema(name: string): boolean;
  getSchema(name: string): SchemaInterface | undefined;
  addSchema(name: string, schema: SchemaInterface): Promise<void>;
}
