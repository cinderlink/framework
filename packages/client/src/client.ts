import {
  CinderlinkProtocolPlugin,
  decodePayload,
  encodePayload,
} from "@cinderlink/protocol";
import { CID } from "multiformats";
import type {
  Peer,
  PluginInterface,
  CinderlinkConstructorOptions,
  SchemaInterface,
  SavedSchema,
  PluginEventHandler,
  OutgoingP2PMessage,
  CinderlinkClientInterface,
  PeerStoreInterface,
  PeerRole,
  EncodingOptions,
  CinderlinkClientEvents,
  ReceiveEvents,
  SubscribeEvents,
  ProtocolEvents,
  PluginEventDef,
  IncomingP2PMessage,
  IncomingPubsubMessage,
  LibP2PPubsubMessage,
  ProtocolRequest,
  DecodedProtocolPayload,
  EncodedProtocolPayload,
} from "@cinderlink/core-types";
import type { OfflineSyncClientPluginInterface } from "@cinderlink/plugin-offline-sync-core";
import Emittery from "emittery";
import * as json from "multiformats/codecs/json";
import { PeerId } from "@libp2p/interface-peer-id";
import type { IPFSWithLibP2P } from "./ipfs/types";
import { Peerstore } from "./peerstore";
import { ClientDIDDag } from "./dag";
import { Identity } from "./identity";
import { Schema } from "@cinderlink/ipld-database";
import { v4 as uuid } from "uuid";
import { DID } from "dids";

export class CinderlinkClient<
    PluginEvents extends PluginEventDef = PluginEventDef
  >
  extends Emittery<CinderlinkClientEvents["emit"] & ProtocolEvents["emit"]>
  implements CinderlinkClientInterface<PluginEvents>
{
  public started = false;
  public hasServerConnection = false;

  public plugins: Record<PluginInterface["id"], PluginInterface> & {
    cinderlink?: CinderlinkProtocolPlugin<PluginEvents & ProtocolEvents>;
  };
  public pluginEvents: Emittery<PluginEvents["emit"]> = new Emittery();
  public peers: PeerStoreInterface = new Peerstore();
  public subscriptions: string[] = [];

  public pubsub: Emittery<SubscribeEvents<PluginEvents>> = new Emittery();
  public p2p: Emittery<ReceiveEvents<PluginEvents>> = new Emittery();

  public ipfs: IPFSWithLibP2P;
  public did: DID;
  public address: string;
  public addressVerification: string;
  public peerId?: PeerId;
  public dag: ClientDIDDag;
  public schemas: Record<string, SchemaInterface> = {};
  public identity: Identity<PluginEvents>;
  public relayAddresses: string[] = [];

  constructor({
    ipfs,
    did,
    address,
    addressVerification,
  }: CinderlinkConstructorOptions) {
    super();
    this.ipfs = ipfs;
    this.did = did;
    this.address = address;
    this.addressVerification = addressVerification;
    this.dag = new ClientDIDDag<PluginEvents>(this);
    this.identity = new Identity<PluginEvents>(this);
    this.plugins = {};
  }

  async addPlugin(plugin: PluginInterface<any>) {
    this.plugins[plugin.id] = plugin;
  }

  getPlugin<T extends PluginInterface<any> = PluginInterface<any>>(
    id: string
  ): T {
    return this.plugins[id] as T;
  }

  hasPlugin(id: string) {
    return this.plugins[id] !== undefined;
  }

  async start() {
    const info = await this.ipfs.id();
    this.peerId = info.id;

    console.info(`client > starting ipfs`);
    await this.ipfs.start();

    await this.load();

    console.info(`client > registering libp2p listeners`);
    const message = this.onPubsubMessage.bind(this);
    this.ipfs.libp2p.pubsub.addEventListener("message", message);

    this.ipfs.libp2p.addEventListener("peer:connect", async (connection) => {
      if (!this.peerId) {
        throw new Error("peerId not set");
      }
      const peerId = connection.detail.remotePeer;
      const peerIdString = peerId.toString();
      let peer: Peer;
      if (!this.peers.hasPeer(peerIdString)) {
        peer = this.peers.addPeer(peerId, "peer");
      } else {
        peer = this.peers.getPeer(peerIdString);
      }

      if (!peer.connected) {
        await this.onConnect(peerId);
      }
    });

    this.ipfs.libp2p.addEventListener("peer:disconnect", (connection) => {
      const peerId = connection.detail.remotePeer.toString();
      if (!this.peers.hasPeer(peerId)) return;
      const peer = this.peers.getPeer(peerId);
      console.info(`client > peer:disconnect`, peer);
      this.peers.updatePeer(peerId, { connected: false, authenticated: false });
      this.emit("/peer/disconnect", peer);
    });

    this.ipfs.libp2p.pubsub.addEventListener("subscription-change", () => {
      // console.info("subscription change", event);
    });

    console.info(
      `plugins > ${
        Object.keys(this.plugins).length
      } plugins found: ${Object.keys(this.plugins).join(", ")}`
    );
    console.info(`plugins > initializing message handlers`);
    await Promise.all(
      Object.values(this.plugins).map(async (plugin) => {
        console.info(`/plugin/${plugin.id} > starting...`, plugin);
        await plugin.start?.();
        console.info(`/plugin/${plugin.id} > registering event handlers...`);
        Object.entries(plugin.pubsub).forEach(([topic, handler]) => {
          this.pubsub.on(topic, (handler as PluginEventHandler).bind(plugin));
          this.subscribe(topic);
        });

        Object.entries(plugin.p2p).forEach(([topic, handler]) => {
          this.p2p.on(topic, (handler as PluginEventHandler).bind(plugin));
        });

        if (plugin.coreEvents)
          Object.entries(plugin.coreEvents).forEach(([topic, handler]) => {
            this.on(
              topic as keyof CinderlinkClientEvents["emit"],
              (handler as PluginEventHandler).bind(plugin)
            );
          });

        if (plugin.pluginEvents)
          Object.entries(plugin.pluginEvents).forEach(([topic, handler]) => {
            this.pluginEvents.on(
              topic as keyof PluginEvents["emit"],
              (handler as PluginEventHandler).bind(plugin)
            );
          });
      })
    );

    console.info(`client > ready`);
    this.emit("/client/ready", {});
  }

  async connect(peerId: PeerId, role: PeerRole = "peer") {
    let peer: Peer;
    if (!this.peers.hasPeer(peerId.toString())) {
      peer = this.peers.addPeer(peerId, role);
    } else {
      peer = this.peers.getPeer(peerId.toString());
    }
    if (
      !(await this.ipfs.libp2p.peerStore.get(peerId)).protocols.includes(
        "/cinderlink/1.0.0"
      )
    ) {
      await this.plugins.cinderlink?.onPeerConnect(peer);
    }
  }

  async onConnect(peerId: PeerId) {
    const peer = this.peers.getPeer(peerId.toString());
    console.info(`peer/connect > connected to ${peerId.toString()}`, peer);
    this.peers.updatePeer(peerId.toString(), { connected: true });
    this.emit("/peer/connect", peer);
  }

  async onPubsubMessage<Encoding extends EncodingOptions = EncodingOptions>(
    evt: CustomEvent
  ) {
    const message = evt as CustomEvent<
      LibP2PPubsubMessage<
        PluginEvents,
        keyof PluginEvents["subscribe"],
        Encoding
      >
    >;
    const peerId = message.detail.from;
    if (peerId === this.ipfs.libp2p.peerId) return;

    let peer = this.peers.getPeer(peerId.toString());
    if (!peer) {
      peer = this.peers.addPeer(peerId, "peer");
    }

    const encodedPayload: EncodedProtocolPayload<
      PluginEvents["subscribe"][keyof PluginEvents["subscribe"]],
      Encoding
    > = json.decode(message.detail.data);

    const decoded = await decodePayload<
      PluginEvents["subscribe"][keyof PluginEvents["subscribe"]],
      Encoding,
      EncodedProtocolPayload<
        PluginEvents["subscribe"][keyof PluginEvents["subscribe"]],
        Encoding
      >
    >(encodedPayload, this.did);

    const incoming: IncomingPubsubMessage<
      PluginEvents,
      keyof PluginEvents["subscribe"],
      Encoding
    > = {
      peer,
      topic: message.detail.topic as keyof PluginEvents["subscribe"],
      ...decoded,
    };

    if (decoded.signed && decoded.sender) {
      const sender = await this.did.resolve(decoded.sender);
      if (sender) {
        peer.did = decoded.sender;
      }
    }

    console.info(`p2p/in > ${incoming.topic as string}`, incoming.payload);
    this.pubsub.emit(incoming.topic, incoming);
  }

  async send<
    Events extends PluginEventDef = PluginEvents,
    Topic extends keyof Events["send"] = keyof Events["send"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    peerId: string,
    message: OutgoingP2PMessage<PluginEvents, Topic, Encoding>,
    options: Encoding = {
      sign: false,
      encrypt: false,
    } as Encoding
  ) {
    const encoded = await encodePayload(
      message.payload as DecodedProtocolPayload<ProtocolRequest, Encoding>,
      { ...options, did: this.did }
    );

    const peer = this.peers.getPeer(peerId);
    if (peer.did && !peer.connected) {
      if (this.hasPlugin("offlineSync")) {
        console.info(`p2p/out > sending message to offline peer ${peerId}`);
        await this.getPlugin<OfflineSyncClientPluginInterface>(
          "offlineSync"
        ).sendMessage(peer.did, {
          topic: message.topic as string,
          payload: encoded.payload,
          signed: encoded.signed,
          encrypted: encoded.encrypted,
          recipients: encoded.recipients,
        });
      }
    }

    if (this.plugins.cinderlink?.protocolHandlers[peer.peerId.toString()]) {
      await this.plugins.cinderlink.protocolHandlers[
        peer.peerId.toString()
      ].buffer.push(json.encode({ ...message, ...encoded }));
    }
  }

  peerReadable(peer: Peer) {
    return `[peerId: ${peer.peerId ? peer.peerId : "(none)"}, did: ${
      peer.did ? peer.did : "(none)"
    }]`;
  }

  async stop() {
    console.info(`stop > shutting down...`);
    await this.save();
    await Promise.all(
      Object.values(this.plugins).map(async (plugin) => {
        await plugin.stop?.();
        Object.entries(plugin.pubsub).forEach(([topic, handler]) => {
          this.unsubscribe(topic);
          this.pubsub.off(topic, (handler as PluginEventHandler).bind(plugin));
        });
      })
    );

    this.ipfs.stop();
  }

  get id() {
    return this.did.id;
  }

  async subscribe(topic: keyof PluginEvents["subscribe"]) {
    if (this.subscriptions.includes(topic as string)) return;
    console.info(`pubsub/subscribe > topic "${topic as string}"`);
    await this.ipfs.libp2p.pubsub.subscribe(topic as string);
    this.subscriptions.push(topic as string);
  }

  async unsubscribe(topic: keyof PluginEvents["subscribe"]) {
    if (!this.subscriptions.includes(topic as string)) return;
    console.info(`pubsub/unsubscribe > topic "${topic as string}"`);
    await this.ipfs.libp2p.pubsub.unsubscribe(topic as string);
    this.subscriptions = this.subscriptions.filter((t) => t !== topic);
  }

  async publish<
    K extends keyof PluginEvents["publish"] = keyof PluginEvents["publish"]
  >(
    topic: K,
    message: PluginEvents["publish"][K],
    options: EncodingOptions = { sign: false, encrypt: false }
  ) {
    const encoded = await encodePayload<
      PluginEvents["publish"][K] extends string | Record<string, unknown>
        ? PluginEvents["publish"][K]
        : never,
      typeof options
    >(message as any, { ...options, did: this.did });

    const bytes = json.encode(encoded);

    console.info(
      `pubsub/publish > topic "${topic as string}" (length: ${bytes.length})`
    );
    // console.debug(`pubsub/publish > topic: ${topic}, message:`, message)
    await this.ipfs.libp2p.pubsub.publish(topic as string, bytes);
  }

  async save() {
    const schemaCIDs: Record<string, string> = {};
    console.debug(`save > saving schemas`);
    await Promise.all(
      Object.entries(this.schemas).map(async ([name, schema]) => {
        const schemaCID = await schema.save();
        console.info(`save > saved schema ${name}`);
        if (schemaCID) {
          schemaCIDs[name] = schemaCID.toString();
        }
      })
    );
    const rootDoc = {
      schemas: schemaCIDs,
      updatedAt: Date.now(),
    };
    console.info(`save > encrypting root document`, rootDoc);
    const rootCID = await this.dag.storeEncrypted(rootDoc);
    if (rootCID) {
      console.log(`save > saved root document with CID ${rootCID.toString()}`);
      await this.identity.save({ cid: rootCID.toString(), document: rootDoc });
    }
  }

  async load() {
    console.info(`load > resolving root document`);
    const { cid, document } = await this.identity.resolve();
    console.info(
      `load > resolved root document with CID ${cid}. loading schemas...`
    );
    if (!cid || !document) return;
    if (document.schemas) {
      await Promise.all(
        Object.entries(document.schemas).map(async ([name, schemaCID]) => {
          if (schemaCID) {
            console.info("load > loading schema", name, schemaCID);
            const schema = await this.dag.loadDecrypted<SavedSchema>(
              CID.parse(schemaCID as string)
            );
            if (schema) {
              console.info(
                `load > loaded schema ${name} with CID ${schemaCID}`
              );
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

  async request<
    Events extends PluginEventDef = PluginEvents,
    OutTopic extends keyof Events["send"] = keyof Events["send"],
    InTopic extends keyof Events["receive"] = keyof Events["receive"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    peerId: string,
    message: OutgoingP2PMessage<Events, OutTopic, Encoding>,
    options: Encoding = { sign: false, encrypt: false } as Encoding
  ): Promise<IncomingP2PMessage<Events, InTopic, Encoding> | undefined> {
    const peer = this.peers.getPeer(peerId);
    if (!peer) {
      throw new Error(`peer does not exist: ${peerId}`);
    }

    const requestId = (message.payload as ProtocolRequest)?.requestId || uuid();
    const request: OutgoingP2PMessage<Events, OutTopic, Encoding> = {
      ...message,
      payload: {
        ...(message.payload as Record<string, unknown>),
        requestId,
      } as any,
    };

    console.info(`request > sending request to ${peerId}`, request);

    const result = new Promise((resolve) => {
      let _timeout: any;
      _timeout = setTimeout(() => {
        console.info(`request response timed out: ${requestId}`);
        wait.off();
        resolve(undefined);
      }, 3000);
      const wait = this.once(`/cinderlink/request/${requestId}`);
      wait.then((value) => {
        console.info(`request response: ${requestId}`, value);
        clearTimeout(_timeout);
        resolve(
          value as unknown as IncomingP2PMessage<Events, InTopic, Encoding>
        );
      });
    }) as Promise<IncomingP2PMessage<Events, InTopic, Encoding> | undefined>;
    await this.send<Events, keyof Events["send"], Encoding>(
      peerId,
      request,
      options
    );
    return result;
  }

  hasSchema(name: string) {
    return this.schemas[name] !== undefined;
  }

  getSchema(name: string) {
    if (!this.hasSchema(name))
      throw new Error("schema does not exist: " + name);
    return this.schemas[name];
  }

  async addSchema(name: string, schema: SchemaInterface) {
    this.schemas[name] = schema;
    await this.save();
  }
}
export default CinderlinkClient;
