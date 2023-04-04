import { multiaddr } from "@multiformats/multiaddr";
import {
  CinderlinkProtocolPlugin,
  decodePayload,
  encodePayload,
} from "@cinderlink/protocol";
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
import { peerIdFromString } from "@libp2p/peer-id";
import { Files } from "./files";
import { JWE } from "did-jwt";

export class CinderlinkClient<
    PluginEvents extends PluginEventDef = PluginEventDef
  >
  extends Emittery<CinderlinkClientEvents["emit"] & ProtocolEvents["emit"]>
  implements CinderlinkClientInterface<PluginEvents>
{
  public running = false;
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
  public files: Files<PluginEvents>;
  public schemas: Record<string, SchemaInterface> = {};
  public identity: Identity<PluginEvents>;
  public relayAddresses: string[] = [];
  public role: PeerRole;
  public initialConnectTimeout: number = 10000;
  public nodeAddresses: string[] = [];
  public nodeReconnectTimer: NodeJS.Timer | undefined = undefined;

  constructor({
    ipfs,
    did,
    address,
    addressVerification,
    role,
  }: CinderlinkConstructorOptions) {
    super();
    this.ipfs = ipfs;
    this.did = did;
    this.address = address;
    this.addressVerification = addressVerification;
    this.dag = new ClientDIDDag<PluginEvents>(this);
    this.identity = new Identity<PluginEvents>(this);
    this.files = new Files<PluginEvents>(this);
    this.role = role;
    this.plugins = {};
  }

  async addPlugin<
    Plugin extends PluginInterface<any, any> = PluginInterface<any, any>
  >(plugin: Plugin) {
    this.plugins[plugin.id] = plugin;
  }

  async startPlugin(id: string) {
    const plugin = this.getPlugin(id);
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
  }

  getPlugin<T extends PluginInterface<any> = PluginInterface<any>>(
    id: string
  ): T {
    return this.plugins[id] as T;
  }

  hasPlugin(id: string) {
    return this.plugins[id] !== undefined;
  }

  async start(nodeAddrs: string[] = []) {
    this.nodeAddresses = nodeAddrs;

    const info = await this.ipfs.id();
    this.peerId = info.id;

    console.info(`client > starting ipfs`);
    await this.ipfs.start();

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
      this.emit("/peer/disconnect", peer);
      this.peers.updatePeer(peerId, { connected: false, authenticated: false });
    });

    this.ipfs.libp2p.pubsub.addEventListener("subscription-change", () => {
      // console.info("subscription change", event);
    });

    const protocol = new CinderlinkProtocolPlugin(this as any);
    this.addPlugin(protocol as any);
    console.info("starting protocol plugin");
    this.startPlugin(protocol.id);
    console.info("connecting to nodes");
    this.connectToNodes();
    console.info("loading");
    await this.load();
    this.nodeReconnectTimer = setInterval(
      this.connectToNodes.bind(this),
      15000
    );

    console.info(
      `plugins > ${
        Object.keys(this.plugins).length
      } plugins found: ${Object.keys(this.plugins).join(", ")}`
    );
    await Promise.all(
      Object.values(this.plugins).map(async (plugin) => {
        if (plugin.id === protocol.id) return;
        console.info(`/plugin/${plugin.id} > starting...`, plugin);
        await this.startPlugin(plugin.id);
      })
    );

    console.info(`client > ready`);
    this.running = true;
    this.emit("/client/ready", {});
  }

  async connectToNodes() {
    Promise.all(
      this.nodeAddresses.map(async (addr) => {
        const peerIdStr = addr.split("/").pop();
        if (peerIdStr === this.peerId?.toString()) return;
        if (peerIdStr) {
          const peer = this.peers.getPeer(peerIdStr);
          if (peer?.connected) {
            return;
          }

          console.info(`client > connecting to node ${peerIdStr}...`);
          this.relayAddresses.push(addr);
          const peerId = peerIdFromString(peerIdStr);
          await this.ipfs.libp2p.peerStore.delete(peerId);
          const connected = await this.ipfs.swarm
            .connect(multiaddr(addr))
            .catch(() => false);
          if (connected !== false) {
            await this.connect(peerId, "server").catch((err: Error) => {
              console.warn(`client > peer ${peerIdStr} could not be dialed`);
              console.error(err);
            });
          } else {
            console.warn(`client > peer ${peerIdStr} could not be dialed`);
          }
        }
      })
    );
  }

  async save(forceRemote = false) {
    if (!this.identity.hasResolved || this.identity.resolving) {
      return;
    }
    const savedSchemas: Record<string, JWE | SavedSchema> = {};
    await Promise.all(
      Object.entries(this.schemas).map(async ([name, schema]) => {
        const exported = await schema.export();
        if (exported) {
          savedSchemas[name] = exported;
        }
      })
    );

    if (!Object.keys(savedSchemas).length) return;

    const rootDoc = {
      schemas: savedSchemas,
      updatedAt: Date.now(),
    };
    console.info(`client/save > encrypting root document`, rootDoc);
    const rootCID = await this.dag.storeEncrypted(rootDoc);
    if (rootCID && rootCID.toString() !== this.identity.cid?.toString()) {
      console.log(
        `client/save > saved root document with CID ${rootCID.toString()}`
      );
      await this.identity.save({
        cid: rootCID.toString(),
        document: rootDoc,
        forceRemote,
      });
    }
  }

  async load() {
    if (!this.hasServerConnection && this.role !== "server") {
      console.info(
        `client/load > waiting for server connection`,
        this.initialConnectTimeout
      );
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.info("client/load > timed out waiting for server");
          this.p2p.off("/cinderlink/handshake/success", onHandshake);
          resolve(false);
        }, this.initialConnectTimeout);
        const onHandshake = (message: any) => {
          if (message.peer.role === "server") {
            console.info("client/load > server connected");
            this.hasServerConnection = true;
            clearTimeout(timeout);
            this.p2p.off("/cinderlink/handshake/success", onHandshake);
            resolve(true);
          }
        };
        this.p2p.on("/cinderlink/handshake/success", onHandshake);
      });
      console.info("Done waiting for server connection");
    }
    console.info(`client/load > resolving root document`);
    const { cid, document } = await this.identity.resolve();
    console.info(
      `client/load > resolved root document?! with CID ${cid}. loading schemas...`,
      { cid, document, hasServer: this.hasServerConnection }
    );
    if (cid && document?.schemas) {
      console.info(
        "client/load > preparing to import schemas",
        document.schemas
      );
      await Promise.all(
        Object.entries(document.schemas).map(async ([name, schema]) => {
          let saved: SavedSchema | undefined = undefined;
          if (typeof schema === "string") {
            // legacy schema support from CID
            console.info("client/load > loading schema from CID", name, schema);
            saved = (await this.dag
              .loadDecrypted(schema, undefined, {
                timeout: 3000,
              })
              .catch(() =>
                this.dag
                  .load(schema, undefined, { timeout: 3000 })
                  .catch(() => undefined)
              )) as SavedSchema | undefined;
          } else if ((schema as SavedSchema).schemaId) {
            console.info("client/load > deserializing schema", name, schema);
            saved = schema as SavedSchema;
          } else if (schema) {
            console.info("client/load > decrypting schema", name, schema);
            const decrypted = await this.dag.did.decryptDagJWE(schema as JWE);
            console.info("client/load > decrypted schema", name, decrypted);
            if ((decrypted as SavedSchema).schemaId) {
              saved = decrypted as SavedSchema;
            }
          }

          if (saved) {
            console.info("client/load > hydrating schema", {
              name,
              schema,
            });
            this.schemas[name] = await Schema.fromSavedSchema(saved, this.dag);
          }
        })
      );
    }
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
    this.emit(`/peer/connect`, peer);
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
    } as Encoding,
    offline = false
  ) {
    const encoded = await encodePayload(
      message.payload as DecodedProtocolPayload<ProtocolRequest, Encoding>,
      { ...options, did: this.did }
    );

    if (!this.peers.hasPeer(peerId)) {
      console.info(`p2p/out > connecting to peer ${peerId}`);
      await this.connect(peerIdFromString(peerId));
    }

    const peer = this.peers.getPeer(peerId);
    if (!peer) return;
    if (
      offline &&
      peer.did &&
      !peer.connected &&
      this.hasPlugin("offlineSyncClient")
    ) {
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
    console.info(`client/stop > shutting down...`);
    // await this.save();
    await Promise.all(
      Object.values(this.plugins).map(async (plugin) => {
        await plugin.stop?.();
        Object.entries(plugin.pubsub).forEach(([topic, handler]) => {
          this.unsubscribe(topic);
          this.pubsub.off(topic, (handler as PluginEventHandler).bind(plugin));
        });
      })
    );

    this.running = false;
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
      console.info("!!!PEERS!!!", this.peers.getPeers());
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

    const result = new Promise((resolve) => {
      let _timeout: any;
      const wait = this.once(`/cinderlink/request/${requestId}`);
      _timeout = setTimeout(() => {
        console.warn(`request response timed out: ${requestId}`);
        wait.off();
        resolve(undefined);
      }, 3000);
      wait.then((value) => {
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
