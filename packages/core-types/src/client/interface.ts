import { Stream } from "@libp2p/interface-connection";
import { Pushable } from "it-pushable";
import * as json from "multiformats/codecs/json";
import type Emittery from "emittery";
import type { PluginInterface, PluginEventDef } from "../plugin/types";
import type { CandorClientEventDef } from "./types";
import type {
  EncodedP2PMessage,
  EncodingOptions,
  OutgoingP2PMessage,
  P2PMessageEvents,
  Peer,
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
  plugins: Record<PluginInterface["id"], PluginInterface<any>>;
  started: boolean;
  hasServerConnection: boolean;
  peers: PeerStoreInterface;
  subscriptions: string[];
  relayAddresses: string[];
  protocol: Record<
    string,
    {
      push?: Pushable<json.ByteView<EncodedP2PMessage>>;
      stream?: Stream;
    }
  >;

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

  addPlugin<T extends PluginInterface<any> = PluginInterface<any>>(
    plugin: T
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

  encodeMessage<
    E extends PluginEventDef["send"] &
      CandorClientEventDef["send"] = PluginEventDef["send"] &
      CandorClientEventDef["send"],
    K extends keyof E = keyof E
  >(
    message: OutgoingP2PMessage<E, K>,
    options: EncodingOptions
  ): Promise<EncodedP2PMessage<E, K>>;

  handleEncodedMessage(
    message: EncodedP2PMessage<PluginEvents["receive"]>,
    peer: Peer
  ): Promise<void>;

  send<
    E extends PluginEvents["send"] &
      CandorClientEventDef["send"] = PluginEvents["send"] &
      CandorClientEventDef["send"],
    K extends keyof E = keyof E
  >(
    peerId: string,
    message: OutgoingP2PMessage<E, K>,
    options?: EncodingOptions
  ): Promise<void>;

  request<Data = any>(
    peerId: string,
    message: OutgoingP2PMessage,
    options?: EncodingOptions
  ): Promise<Data | undefined>;

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
