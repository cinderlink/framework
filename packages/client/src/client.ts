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
  PluginBaseInterface,
  LoggerInterface,
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
import { Logger } from "./logger/logger";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";

export class CinderlinkClient<
    PluginEvents extends PluginEventDef = PluginEventDef
  >
  extends Emittery<CinderlinkClientEvents["emit"] & ProtocolEvents["emit"]>
  implements CinderlinkClientInterface<PluginEvents>
{
  public running = false;
  public hasServerConnection = false;

  public plugins: Record<PluginInterface["id"], PluginInterface> & {
    cinderlink?: CinderlinkProtocolPlugin;
  };
  public pluginEvents: Emittery<PluginEvents["emit"]> = new Emittery();
  public peers: PeerStoreInterface = new Peerstore();
  public subscriptions: string[] = [];

  public pubsub: Emittery<
    SubscribeEvents<PluginEvents & CinderlinkClientEvents>
  > = new Emittery();
  public p2p: Emittery<ReceiveEvents<PluginEvents & CinderlinkClientEvents>> =
    new Emittery();

  public ipfs: IPFSWithLibP2P;
  public did: DID;
  public address: `0x${string}`;
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
  public logger: LoggerInterface;
  public nodeReconnectTimer: NodeJS.Timer | undefined = undefined;

  constructor({
    ipfs,
    did,
    address,
    addressVerification,
    role,
    logger,
  }: CinderlinkConstructorOptions) {
    super();
    this.ipfs = ipfs;
    this.did = did;
    this.address = address;
    this.addressVerification = addressVerification;
    this.logger = logger || new Logger();
    this.role = role;
    this.plugins = {};
    this.dag = new ClientDIDDag<PluginEvents>(this);
    this.identity = new Identity<PluginEvents>(this);
    this.files = new Files<PluginEvents>(this);
  }

  async addPlugin<Plugin extends PluginBaseInterface>(plugin: Plugin) {
    this.plugins[plugin.id] = plugin;
    if (this.running) {
      await this.startPlugin(plugin.id);
    }
  }

  async startPlugin(id: string) {
    const plugin = this.getPlugin(id);
    this.logger.info("plugins", `starting ${plugin.id} plugin`);
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

    await plugin.start?.();
  }

  getPlugin<T extends PluginBaseInterface>(id: string): T {
    return this.plugins[id] as T;
  }

  hasPlugin(id: string) {
    return this.plugins[id] !== undefined;
  }

  async start(nodeAddrs: string[] = []) {
    this.nodeAddresses = nodeAddrs;

    const info = await this.ipfs.id();
    this.peerId = info.id;

    this.logger.info("ipfs", "starting ipfs");
    await this.ipfs.start();

    this.logger.info("ipfs", "registering libp2p listeners");
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

      await this.onPeerConnect(peer);
    });

    this.ipfs.libp2p.addEventListener("peer:disconnect", (connection) => {
      const peerId = connection.detail.remotePeer.toString();
      const peer = this.peers.getPeer(peerId);
      this.logger.info("p2p", "peer disconnected", { peerId, peer });
      return this.onPeerDisconnect(peer);
    });

    this.ipfs.libp2p.pubsub.addEventListener("subscription-change", (event) => {
      this.logger.debug("pubsub", "subscription change", { event });
    });

    const protocol = new CinderlinkProtocolPlugin(this as any);
    await this.addPlugin(protocol);
    await this.startPlugin(protocol.id);
    await this.connectToNodes();

    this.logger.debug("identity", "loading identity (client)");
    await this.load();
    this.nodeReconnectTimer = setInterval(this.connectToNodes.bind(this), 5000);

    await Promise.all([
      this.subscribe("/peer/connect"),
      this.subscribe("/peer/disconnect"),
    ]);

    this.pubsub.on("/peer/connect", (message) => {
      this.logger.debug("p2p", "received /peer/connect pubsub", message);
      if (message.peer) {
        this.onPeerConnect(message.peer);
      }
    });

    this.pubsub.on("/peer/disconnect", (message) => {
      this.logger.debug("p2p", "received /peer/disconnect pubsub", message);
      if (message.peer) {
        this.onPeerDisconnect(message.peer);
      }
    });

    this.logger.info("plugins", "loading plugins", {
      plugins: Object.keys(this.plugins),
    });
    await Promise.all(
      Object.values(this.plugins).map(async (plugin) => {
        if (plugin.id === protocol.id) return;
        await this.startPlugin(plugin.id);
      })
    );

    this.logger.info("p2p", "sending /peer/connect pubsub");
    await this.publish<CinderlinkClientEvents, "/peer/connect">(
      "/peer/connect",
      {
        did: this.id,
        peerId: this.peerId.toString(),
      }
    );

    this.logger.info("client", "ready");
    this.running = true;
    this.emit("/client/ready", {});

    setTimeout(() => {
      this.ipfs.repo.gc();
    }, 3000);
  }

  async onPeerConnect(peer: Peer) {
    this.logger.info("p2p", `peer connected ${this.peerReadable(peer)}`, {
      peer,
    });
    this.emit("/peer/connect", peer);
    this.peers.updatePeer(peer.peerId.toString(), {
      connected: true,
    });
  }
  async onPeerDisconnect(peer: Peer) {
    this.logger.info("p2p", `peer disconnected ${this.peerReadable(peer)}`, {
      peer,
    });
    await this.peers.updatePeer(peer.peerId.toString(), {
      connected: false,
    });
    await this.emit("/peer/disconnect", peer);
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

          this.logger.info("p2p", "connecting to node", { peerId: peerIdStr });
          this.relayAddresses.push(addr);
          const peerId = peerIdFromString(peerIdStr);
          await this.ipfs.libp2p.peerStore.delete(peerId);
          const connected = await this.ipfs.swarm
            .connect(multiaddr(addr))
            .catch(() => false);
          if (connected !== false) {
            await this.connect(peerId, "server").catch((err: Error) => {
              this.logger.error("p2p", "peer could not be dialed", {
                peerId: peerIdStr,
                err,
              });
            });
          } else {
            this.logger.error("p2p", "peer could not be dialed", {
              peerId: peerIdStr,
            });
          }
        }
      })
    );
  }

  hasUnsavedChanges() {
    return Object.values(this.schemas).some((schema) => {
      if (schema.schemaId !== "sync" && schema.hasChanges()) {
        return true;
      }
      return false;
    });
  }

  async save(forceRemote = false, forceImmediate = false) {
    if (!this.identity.hasResolved || this.identity.resolving) {
      return;
    }
    if (!this.hasUnsavedChanges()) {
      return;
    }
    if (!this.ipfs.isOnline()) {
      this.logger.error("ipfs", "ipfs is offline");
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
    this.logger.info("identity", "saving root document", { rootDoc });
    const rootCID = await this.dag
      .storeEncrypted(rootDoc)
      .catch(() => undefined);
    if (rootCID && rootCID.toString() !== this.identity.cid?.toString()) {
      this.logger.info("identity", "saved root document", { rootCID });
      await this.identity.save({
        cid: rootCID,
        document: rootDoc,
        forceRemote,
        forceImmediate,
      });
    }
  }

  async load() {
    if (!this.hasServerConnection && this.role !== "server") {
      this.logger.info("p2p", "waiting for server connection", {
        timeout: this.initialConnectTimeout,
      });
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.logger.warn("p2p", "timed out waiting for server");
          this.p2p.off("/peer/connected", onPeerConnect.bind(this));
          resolve(false);
        }, this.initialConnectTimeout);
        const onPeerConnect = (message: any) => {
          if (message.peer.role === "server") {
            this.logger.info("p2p", "server connected", { message });
            this.hasServerConnection = true;
            clearTimeout(timeout);
            this.p2p.off("/peer/connected", onPeerConnect.bind(this));
            resolve(true);
          }
        };
        this.p2p.on("/peer/connected", onPeerConnect.bind(this));
      });
    }
    this.logger.debug("identity", "resolving root document");
    const { cid, document } = await this.identity.resolve();
    this.logger.info("identity", "resolved root document", { cid });
    if (cid && document?.schemas) {
      this.logger.debug("identity", "importing schemas", {
        schemas: document.schemas,
      });
      await Promise.all(
        Object.entries(document.schemas).map(async ([name, schema]) => {
          let saved: SavedSchema | undefined = undefined;
          if (typeof schema === "string") {
            // legacy schema support from CID
            this.logger.debug("identity", "loading schema from CID", {
              name,
              schema,
            });
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
            this.logger.debug("identity", "deserializing schema", {
              name,
              schema,
            });
            saved = schema as SavedSchema;
          } else if (schema) {
            this.logger.debug("identity", "decrypting schema", {
              name,
              schema,
            });
            const decrypted = await this.dag.did.decryptDagJWE(schema as JWE);
            this.logger.debug("identity", "decrypted schema", {
              name,
              decrypted,
            });
            if ((decrypted as SavedSchema).schemaId) {
              saved = decrypted as SavedSchema;
            }
          }

          if (saved) {
            this.logger.debug("identity", "hydrating schema", { name, schema });
            this.schemas[name] = await Schema.fromSavedSchema(
              saved,
              this.dag,
              this.logger.module("db").submodule(`schema:${name}`)
            );
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
    if (peer.connected) {
      return;
    }
    const addr = await this.ipfs.libp2p.peerStore.addressBook.get(peer.peerId);
    if (addr[0]) {
      this.logger.debug("p2p", `connect - connecting to peer: ${peer.peerId}`, {
        addr: addr[0].multiaddr.toString(),
      });
    } else {
      const relayAddr = `${this.relayAddresses[0]}/p2p-circuit/p2p/${peer.peerId}`;
      this.logger.debug(
        "p2p",
        `connect - connecting to peer: ${peer.peerId}, via relay: ${relayAddr}`
      );
      await this.ipfs.libp2p.peerStore.addressBook.set(peer.peerId, [
        multiaddr(relayAddr),
      ]);
    }
    await this.ipfs.swarm.connect(peer.peerId);
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
    if (peerId === this.ipfs.libp2p.peerId) {
      return;
    }

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

    if (!decoded.sender) {
      this.logger.warn("pubsub", "ignoring unidentifiable pubsub message", {
        message: decoded,
      });
      return;
    }

    if (!peer.did) {
      peer.did = decoded.sender;
    }

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

    this.logger.debug("pubsub", "incoming message", {
      topic: incoming.topic,
      message: incoming,
    });
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
      sign: true,
      encrypt: false,
    } as Encoding,
    offline = false
  ) {
    if (!options.sign && !options.encrypt) {
      this.logger.error("p2p", "message must be signed or encrypted", {
        peerId,
        message,
        options,
      });
      throw new Error("Message must be signed or encrypted");
    }

    if (!this.peers.hasPeer(peerId)) {
      this.logger.debug("p2p", `send - connecting to peer:  ${peerId}`);
      await this.connect(peerIdFromString(peerId));
    }

    const peer = this.peers.getPeer(peerId);
    if (!peer) {
      this.logger.error("p2p", `send - peer not found:  ${peerId}`);
      throw new Error(`Peer ${peerId} not found`);
    }

    const encoded = await encodePayload(
      message.payload as DecodedProtocolPayload<ProtocolRequest, Encoding>,
      { ...options, did: this.did }
    );

    if (
      offline &&
      peer.did &&
      !peer.connected &&
      this.hasPlugin("offlineSyncClient")
    ) {
      this.logger.info("p2p", `sending message to offline peer: ${peerId}`, {
        peerId,
        message,
      });
      await this.getPlugin<OfflineSyncClientPluginInterface>(
        "offlineSync"
      ).sendMessage(peer.did, {
        topic: message.topic as string,
        payload: encoded.payload,
        signed: encoded.signed,
        encrypted: encoded.encrypted,
        recipients: encoded.recipients,
      });
      return;
    }

    const stream = await this.ipfs.libp2p.dialProtocol(
      peer.peerId,
      "/cinderlink/1.0.0"
    );

    pipe([json.encode({ ...message, ...encoded })], lp.encode, stream.sink);
  }

  peerReadable(peer: Peer) {
    return `[peerId: ${peer.peerId ? peer.peerId : "(none)"}, did: ${
      peer.did ? peer.did : "(none)"
    }]`;
  }

  async stop() {
    if (!this.running) return;
    this.logger.warn("client", "shutting down");
    this.running = false;
    clearInterval(this.nodeReconnectTimer);

    this.logger.debug("pubsub", "publishing disconnect event");
    await Promise.all([
      this.publish<CinderlinkClientEvents, "/peer/disconnect">(
        "/peer/disconnect",
        {
          did: this.id,
          peerId: this.peerId?.toString() || "",
          reason: "client shutting down",
        }
      ),

      this.save(),
      Promise.all(
        Object.values(this.plugins).map(async (plugin) => {
          await plugin.stop?.();
        })
      ),
    ]).then(async () => {
      await this.ipfs.stop().catch(() => {});
    });
  }

  get id() {
    return this.did.id;
  }

  async subscribe(topic: keyof PluginEvents["subscribe"]) {
    if (this.subscriptions.includes(topic as string)) return;
    this.logger.debug("pubsub", `subscribing to topic: ${topic as string}`);
    await this.ipfs.libp2p.pubsub.subscribe(topic as string);
    this.subscriptions.push(topic as string);
  }

  async unsubscribe(topic: keyof PluginEvents["subscribe"]) {
    if (!this.subscriptions.includes(topic as string)) return;
    this.logger.debug("pubsub", `unsubscribing from topic: ${topic as string}`);
    await this.ipfs.libp2p.pubsub.unsubscribe(topic as string);
    this.subscriptions = this.subscriptions.filter((t) => t !== topic);
  }

  async publish<
    P extends PluginEventDef = PluginEventDef,
    K extends keyof P["publish"] = keyof P["publish"]
  >(
    topic: K,
    message: P["publish"][K],
    options: EncodingOptions = { sign: true, encrypt: false }
  ) {
    if (!options.sign && !options.encrypt) {
      this.logger.error("pubsub", "message must be signed or encrypted", {
        topic,
        message,
        options,
      });
      throw new Error("Pubsub message must be signed or encrypted");
    }

    const encoded = await encodePayload<
      P["publish"][K] extends string | Record<string, unknown>
        ? P["publish"][K]
        : never,
      typeof options
    >(message, { ...options, did: this.did });

    const bytes = json.encode(encoded);
    this.logger.debug(
      "pubsub",
      `publishing message on topic: ${topic as string} (length: ${
        bytes.length
      })`,
      { message, options }
    );
    try {
      await this.ipfs.libp2p.pubsub.publish(topic as string, bytes);
    } catch (e) {
      this.logger.error("pubsub", "failed to publish message", {
        topic: topic as string,
        message,
        error: e,
      });
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

    const result = new Promise((resolve) => {
      let _timeout: any;
      const wait = this.once(`/cinderlink/request/${requestId}`);
      _timeout = setTimeout(() => {
        this.logger.error("p2p", "request timed out", {
          requestId,
          peerId,
          message,
        });
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
