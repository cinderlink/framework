import type {
  Peer,
  PubsubMessage,
  PubsubMessageEvents,
  PluginInterface,
  PluginEventDef,
  CandorClientEvents,
  CandorConstructorOptions,
} from "@candor/core-types";
import type { DID } from "dids";
import Emittery from "emittery";
import * as json from "multiformats/codecs/json";
import { SavedSchema, Schema } from "@candor/ipld-database";
import { pipe } from "it-pipe";
import * as lp from "it-length-prefixed";
import map from "it-map";
import { PeerId } from "@libp2p/interface-peer-id";
import type { IPFSWithLibP2P } from "./ipfs/types";
import { Peerstore } from "./peerstore";
import { ClientDIDDag } from "./dag";
import { Identity } from "./identity";
import { fromPeerId } from "./did/util";

export class CandorClient<
  PluginEvents extends PluginEventDef = PluginEventDef,
  EmitEvents extends PluginEvents["emit"] &
    CandorClientEvents = PluginEvents["emit"] & CandorClientEvents
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
  public did: DID;
  public peerId?: PeerId;
  public dag: ClientDIDDag;
  public schemas: Record<string, Schema> = {};
  public identity: Identity;
  public p2pStreams: Record<string, any> = {};

  constructor({ ipfs, did }: CandorConstructorOptions) {
    super();
    this.ipfs = ipfs;
    this.did = did;
    this.dag = new ClientDIDDag(this);
    this.identity = new Identity(this);
    this.plugins = {};
  }

  async addPlugin(plugin: PluginInterface<any>) {
    this.plugins[plugin.id] = plugin;
  }

  async start() {
    await this.ipfs.start();
    const info = await this.ipfs.id();
    this.peerId = info.id;

    await this.load();

    this.ipfs.libp2p.pubsub.addEventListener(
      "message",
      this.onMessage.bind(this)
    );

    this.ipfs.libp2p.connectionManager.addEventListener(
      "peer:connect",
      (connection) => {
        const peerId = connection.detail.remotePeer;
        let peer: Peer;
        if (!this.peers.hasPeerWithPeerId(peerId)) {
          peer = this.peers.addPeerByPeerId(peerId);
        } else {
          peer = this.peers.getPeerByPeerId(peerId);
        }
        this.peers.updatePeer(peer.did, { connected: true });
        this.emit("/peer/connect", peer);
      }
    );

    this.ipfs.libp2p.connectionManager.addEventListener(
      "peer:disconnect",
      (connection) => {
        const peerId = connection.detail.remotePeer;
        if (!this.peers.hasPeerWithPeerId(peerId)) return;
        const peer = this.peers.getPeerByPeerId(peerId);
        this.peers.updatePeer(peer.did, { connected: false });
        this.emit("/peer/disconnect", peer);
      }
    );

    this.ipfs.libp2p.pubsub.addEventListener("subscription-change", (event) => {
      console.info("subscription change", event);
    });

    // on peer message
    this.ipfs.libp2p.handle("/candor/1.0.0", async ({ stream }) => {
      await this.streamToEmitter(stream);
    });

    console.info("starting plugins pubsub");
    await Promise.all(
      Object.values(this.plugins).map(async (plugin) => {
        await plugin.start?.();
        Object.entries(plugin.pubsub).forEach(([topic, handler]) => {
          this.pubsub.on(topic, handler.bind(plugin));
          setTimeout(() => {
            this.subscribe(topic);
          }, 3000);
        });
      })
    );
    this.emit("/client/ready", undefined);
  }

  async connect(peerId: PeerId) {
    const did = fromPeerId(peerId);
    this.p2pStreams[did] = await this.ipfs.libp2p.dialProtocol(peerId, [
      "/candor/1.0.0",
    ]);
    await this.ipfs.libp2p.dialProtocol(peerId, ["/floodsub/1.0.0"]);
    console.info("connected to peer", did);
  }

  async send(did: string, message: unknown) {
    const encoded = json.encode(message);
    if (!this.p2pStreams[did]) {
      throw new Error("no stream to peer: " + did);
    }
    await pipe([encoded], lp.encode(), this.p2pStreams[did].sink);
  }

  async streamToEmitter(stream: any) {
    const p2p = this.p2p;
    pipe(
      stream.source,
      lp.decode(),
      (source) =>
        map(source, (buf) => json.decode<PubsubMessage>(buf.subarray())),
      async function (source) {
        for await (const msg of source) {
          p2p.emit(
            msg.topic as keyof PluginEvents["receive"],
            msg as PluginEvents["receive"][keyof PluginEvents["receive"]]
          );
        }
      }
    );
  }

  async stop() {
    await Promise.all(
      Object.values(this.plugins).map(async (plugin) => {
        await plugin.stop?.();
        Object.entries(plugin.pubsub).forEach(([topic, handler]) => {
          this.unsubscribe(topic);
          this.pubsub.off(topic, handler.bind(plugin));
        });
      })
    );
    await Promise.all(
      Object.values(this.p2pStreams).map(async (stream) => {
        await stream.close();
      })
    );

    console.info("saving candor database");
    await this.save();

    this.ipfs.stop();
  }

  get id() {
    return this.did.id;
  }

  async subscribe(topic: keyof PluginEvents["subscribe"]) {
    if (this.subscriptions.includes(topic as string)) return;
    console.info(`Subscribing to ${topic as string}`);
    await this.ipfs.libp2p.pubsub.subscribe(topic as string);
    this.subscriptions.push(topic as string);
  }

  async unsubscribe(topic: keyof PluginEvents["subscribe"]) {
    if (!this.subscriptions.includes(topic as string)) return;
    console.info(`Unsubscribing from ${topic as string}`);
    await this.ipfs.libp2p.pubsub.unsubscribe(topic as string);
    this.subscriptions = this.subscriptions.filter((t) => t !== topic);
  }

  async publish<
    K extends keyof PluginEvents["publish"] = keyof PluginEvents["publish"]
  >(topic: K, message: PluginEvents["publish"][K]) {
    console.info(`Publishing to ${topic as string}`, message);
    await this.ipfs.libp2p.pubsub.publish(
      topic as string,
      json.encode(message)
    );
  }

  async onMessage(message: any) {
    const msg = message.detail as PubsubMessage;
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

  async save() {
    const schemaCIDs: Record<string, string> = {};
    console.info("saving schemas", this.schemas);
    await Promise.all(
      Object.entries(this.schemas).map(async ([name, schema]) => {
        const schemaCID = await schema.save();
        console.info("saved schema", { name, schemaCID });
        if (schemaCID) {
          schemaCIDs[name] = schemaCID.toString();
        }
      })
    );
    const rootDoc = {
      schemas: schemaCIDs,
      updatedAt: Date.now(),
    };
    console.info("saving root", { rootDoc });
    const rootCID = await this.dag.storeEncrypted(rootDoc);
    if (rootCID) {
      console.info("saved root", { rootCID });
      await this.identity.save({ cid: rootCID.toString(), document: rootDoc });
    }
  }

  async load() {
    console.info("loading");
    const { cid, document } = await this.identity.resolve();
    console.info("resolved", { cid, document });
    if (!cid || !document) return;
    if (document.schemas) {
      await Promise.all(
        Object.entries(document.schemas).map(async ([name, schemaCID]) => {
          if (schemaCID) {
            const schema = await this.dag.loadDecrypted<SavedSchema>(schemaCID);
            if (schema) {
              this.schemas[name] = await Schema.fromSavedSchema(
                schema,
                this.dag
              );
            }
          }
        })
      );
    }
  }

  hasSchema(name: string) {
    return this.schemas[name] !== undefined;
  }

  getSchema(name: string) {
    return this.schemas[name];
  }

  async addSchema(name: string, schema: Schema) {
    this.schemas[name] = schema;
    await this.save();
  }
}
export default CandorClient;
