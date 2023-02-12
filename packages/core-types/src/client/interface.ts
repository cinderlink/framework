import type Emittery from "emittery";
import type { PluginInterface, PluginEventDef } from "../plugin/types";
import type { CandorClientEventDef } from "./types";
import type {
  OutgoingP2PMessage,
  P2PMessageEvents,
  PeerRole,
  PeerStoreInterface,
} from "../p2p";
import type { PubsubMessageEvents } from "../pubsub";
import type { IPFSWithLibP2P } from "../ipfs";
import type { DID } from "dids";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { DIDDagInterface } from "../dag";
import type { IdentityInterface } from "../identity";
import { SchemaInterface } from "../database/schema";
export interface CandorClientInterface<
  PluginEvents extends PluginEventDef = PluginEventDef
> extends Emittery<CandorClientEventDef["emit"]> {
  plugins: Record<PluginInterface["id"], PluginInterface<PluginEventDef>>;
  started: boolean;
  hasServerConnection: boolean;
  peers: PeerStoreInterface;
  subscriptions: string[];
  relayAddresses: string[];

  pubsub: Emittery<
    PubsubMessageEvents<
      PluginEvents["subscribe"] | CandorClientEventDef["subscribe"]
    >
  >;

  p2p: Emittery<
    P2PMessageEvents<PluginEvents["receive"]> &
      P2PMessageEvents<CandorClientEventDef["receive"]>
  >;

  ipfs: IPFSWithLibP2P;
  did: DID;
  peerId?: PeerId;
  dag: DIDDagInterface;
  schemas: Record<string, SchemaInterface>;
  identity: IdentityInterface;

  get id(): string;

  addPlugin<T extends PluginInterface<any>>(plugin: T): Promise<void>;

  getPlugin<T extends PluginInterface<any> = PluginInterface>(id: string): T;

  hasPlugin(id: string): boolean;

  start(): Promise<void>;
  stop(): Promise<void>;
  save(): Promise<void>;
  load(): Promise<void>;
  connect(peerId: PeerId, role?: PeerRole): Promise<void>;

  send<
    E extends PluginEvents["send"] &
      CandorClientEventDef["send"] = PluginEvents["send"] &
      CandorClientEventDef["send"],
    K extends keyof E = keyof E
  >(
    peerId: string,
    message: OutgoingP2PMessage<E, K>
  ): Promise<void>;

  subscribe(
    topic:
      | keyof PluginEvents["subscribe"]
      | keyof CandorClientEventDef["subscribe"]
  ): Promise<void>;

  unsubscribe(
    topic:
      | keyof PluginEvents["subscribe"]
      | keyof CandorClientEventDef["subscribe"]
  ): Promise<void>;

  publish<
    K extends keyof (PluginEvents | CandorClientEventDef)["subscribe"],
    V extends (PluginEvents | CandorClientEventDef)["subscribe"][K]
  >(
    topic: K,
    message: V,
    options?: {
      sign?: boolean;
      encrypt?: boolean;
      cid?: boolean;
      recipients?: string[];
    }
  ): Promise<void>;

  hasSchema(name: string): boolean;
  getSchema(name: string): SchemaInterface | undefined;
  addSchema(name: string, schema: SchemaInterface): Promise<void>;
}
