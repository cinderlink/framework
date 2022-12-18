import type { DID } from "dids";
import type { IPFSWithLibP2P } from "ipfs/types";
import Emittery from "emittery";
import * as json from "multiformats/codecs/json";
import { Peer, Peerstore } from "./peerstore";
import type {
  PluginInterface,
  PluginEventDef,
  PluginEventPayloads,
} from "plugin/types";
import { PeerId } from "@libp2p/interface-peer-id";

export type CryptidsConstructorOptions = {
  ipfs: IPFSWithLibP2P;
  did: DID;
};

export type PubsubMessage<Data = any> = {
  type: "signed" | "unsigned";
  from: PeerId;
  peer: Peer;
  sequenceNumber: number;
  topic: string;
  data: Data;
  signature?: Uint8Array;
};

export type PubsubMessageEvents<
  Payloads extends PluginEventPayloads = PluginEventPayloads
> = {
  [key in keyof Payloads]: PubsubMessage<Payloads[key]>;
};

export type ClientEvents = {
  "/client/ready": undefined;
  "/peer/connect": Peer;
  "/peer/disconnect": Peer;
  "/peer/handshake": Peer;
  "/peer/message": {
    type: string;
    peer: Peer;
    message: unknown;
  };
  "/pubsub/message": PubsubMessage;
};

export class CryptidsClient<
  PluginEvents extends PluginEventDef = PluginEventDef,
  EmitEvents extends PluginEvents["emit"] &
    ClientEvents = PluginEvents["emit"] & ClientEvents
> extends Emittery<EmitEvents> {
  public plugins: Record<PluginInterface["id"], PluginInterface<PluginEvents>>;
  public started = false;
  public hasServerConnection = false;
  public peers: Peerstore = new Peerstore();
  public subscriptions: string[] = [];

  public pubsub: Emittery<PubsubMessageEvents<PluginEvents["subscribe"]>> =
    new Emittery();
  public p2p: Emittery<PluginEvents["receive"]> = new Emittery();

  public ipfs: IPFSWithLibP2P;
  private did: DID;

  constructor({ ipfs, did }: CryptidsConstructorOptions) {
    super();
    this.ipfs = ipfs;
    this.did = did;
    this.plugins = {};
  }

  async addPlugin(plugin: PluginInterface<any>) {
    this.plugins[plugin.id] = plugin;
  }

  async start() {
    await this.ipfs.start();

    const info = await this.ipfs.id();
    console.info("ipfs ready", info);

    await Promise.all(
      Object.values(this.plugins).map(async (plugin) => {
        await plugin.start?.();
      })
    );

    this.ipfs.libp2p.connectionManager.addEventListener(
      "peer:connect",
      (connection) => {
        console.info("peer connected", connection);
        const peerId = connection.detail.remotePeer;
        let peer: Peer;
        if (!this.peers.hasPeerWithPeerId(peerId)) {
          peer = this.peers.addPeerByPeerId(peerId);
        } else {
          peer = this.peers.getPeerByPeerId(peerId);
        }
        this.peers.updatePeer(peer.did, { connected: true });
        console.info("Peer connected", peer.did);
        this.emit("/peer/connect", peer);
      }
    );

    this.ipfs.libp2p.connectionManager.addEventListener(
      "peer:disconnect",
      (connection) => {
        console.info("peer connected", connection);
        const peerId = connection.detail.remotePeer;
        if (!this.peers.hasPeerWithPeerId(peerId)) return;
        const peer = this.peers.getPeerByPeerId(peerId);
        this.peers.updatePeer(peer.did, { connected: false });
        console.info("Peer disconnected", peer.did);
        this.emit("/peer/disconnect", peer);
      }
    );

    this.emit("/client/ready", undefined);

    console.info("Listen addrs:", await this.ipfs.swarm.localAddrs());
    console.info("Peers:", await this.ipfs.swarm.peers());
  }

  async stop() {
    await Promise.all(
      Object.values(this.plugins).map(async (plugin) => {
        await plugin.stop?.();
      })
    );
    this.ipfs.stop();
  }

  get id() {
    return this.did.id;
  }

  async subscribe(topic: keyof PluginEvents["subscribe"]) {
    if (this.subscriptions.includes(topic as string)) return;
    await this.ipfs.pubsub.subscribe(
      topic as string,
      this.onMessage.bind(this)
    );
    this.subscriptions.push(topic as string);
  }

  async unsubscribe(topic: keyof PluginEvents["subscribe"]) {
    if (!this.subscriptions.includes(topic as string)) return;
    await this.ipfs.pubsub.unsubscribe(
      topic as string,
      this.onMessage.bind(this)
    );
    this.subscriptions = this.subscriptions.filter((t) => t !== topic);
  }

  async publish<
    K extends keyof PluginEvents["publish"] = keyof PluginEvents["publish"]
  >(topic: K, message: PluginEvents["publish"][K]) {
    await this.ipfs.pubsub.publish(topic as string, json.encode(message));
  }

  async onMessage(message: unknown) {
    const msg = message as PubsubMessage;
    if (msg.from === this.ipfs.libp2p.peerId) return;
    const peer = this.peers.getPeerByPeerId(msg.from);
    const decoded = json.decode<
      PluginEvents["subscribe"][keyof PluginEvents["subscribe"]]
    >(msg.data);

    const event = {
      ...msg,
      peer,
      data: decoded,
    };

    this.pubsub.emit(msg.topic, event as any);
  }
}
export default CryptidsClient;
