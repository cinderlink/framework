import { multiaddr } from "@multiformats/multiaddr";
import {
  CinderlinkProtocolPlugin,
  decodePayload,
  encodePayload,
} from "@cinderlink/protocol";
import type { PubSubService } from "./types/libp2p.js";
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
  IPFSWithLibP2P,
  IdentityInterface,
} from "@cinderlink/core-types";
import type { OfflineSyncClientPluginInterface } from "@cinderlink/plugin-offline-sync-core";
import Emittery from "emittery";
import * as json from "multiformats/codecs/json";
import { PeerId } from "@libp2p/interface";
import { CID } from "multiformats/cid";
import { Peerstore } from "./peerstore.js";
import { ClientDIDDag } from "./dag.js";
import { Identity } from "./identity.js";
import { Schema } from "@cinderlink/ipld-database";
import { v4 as uuid } from "uuid";
import { DID } from "dids";
import { peerIdFromString } from "@libp2p/peer-id";
import { Files } from "./files.js";
import { JWE } from "did-jwt";
import { Logger } from "./logger/logger.js";
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
  public peers: PeerStoreInterface;
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
  public identity: IdentityInterface<Record<string, unknown>>;
  public relayAddresses: string[] = [];
  public role: PeerRole;
  public initialConnectTimeout: number = 3000;
  public keepAliveTimeout: number = 10000;
  public keepAliveInterval: number = 5000;
  public nodeAddresses: string[] = [];
  public logger: LoggerInterface;
  public nodeReconnectTimer: NodeJS.Timeout | undefined = undefined;
  public saving = false;

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
    this.dag = new ClientDIDDag<PluginEvents>(this as unknown as CinderlinkClientInterface<PluginEvents>);
    this.identity = new Identity<PluginEvents>(this as unknown as CinderlinkClientInterface<PluginEvents>) as unknown as IdentityInterface<Record<string, unknown>>;
    this.files = new Files<PluginEvents>(this as unknown as CinderlinkClientInterface<PluginEvents>);
    this.peers = new Peerstore("");
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

  start(nodeAddrs: string[] = []) {
    this.nodeAddresses = nodeAddrs;

    // In Helia, peer ID is directly available from libp2p
    this.peerId = this.ipfs.libp2p.peerId;
    if (!this.peerId) {
      throw new Error("Failed to get peer ID from libp2p");
    }
    this.peers.localPeerId = this.peerId.toString();

    this.logger.info("ipfs", "starting helia node");
    // Helia doesn't need explicit start() call

    this.logger.info("ipfs", "registering libp2p listeners");
    const message = this.onPubsubMessage.bind(this);
    
    // Check if pubsub is available before using it
    const pubsub = this.ipfs.libp2p.services.pubsub as PubSubService | undefined;
    if (pubsub) {
      pubsub.addEventListener("message", message);
    } else {
      this.logger.warn("ipfs", "pubsub not available in libp2p");
    }

    this.ipfs.libp2p.addEventListener(
      "peer:connect",
      async (event: CustomEvent<PeerId>) => {
        if (!this.peerId) {
          throw new Error("peerId not set");
        }
        const peerId = event.detail;
        const peerIdString = peerId.toString();
        let peer: Peer;
        if (!this.peers.hasPeer(peerIdString)) {
          peer = this.peers.addPeer(peerId, "peer");
        } else {
          peer = this.peers.getPeer(peerIdString);
        }
        if (!peer) return;
        await this.onPeerConnect(peer);
      }
    );

    this.ipfs.libp2p.addEventListener(
      "peer:disconnect",
      (event: CustomEvent<PeerId>) => {
        const peerId = event.detail.toString();
        const peer = this.peers.getPeer(peerId);
        if (peer) {
          this.logger.info("p2p", "peer disconnected", { peerId, peer });
          this.onPeerDisconnect(peer);
        }
      }
    );

    const pubsubService = this.ipfs.libp2p.services.pubsub as PubSubService | undefined;
    if (pubsubService) {
      pubsubService.addEventListener(
        "subscription-change",
        (event: CustomEvent) => {
          this.logger.debug("pubsub", "subscription change", { event });
        }
      );
    }

    this.on("/server/connect", () => {
      this.hasServerConnection = true;
    });

    this.on("/client/loaded", () => {
      this.hasServerConnection = this.peers.getServerCount() > 0;
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
          peerId: this.peerId?.toString() as string,
        }
      );

      this.logger.info("client", "ready");
      this.running = true;
      this.emit("/client/ready", {});
    });

    const protocol = new CinderlinkProtocolPlugin(this as any);
    await this.addPlugin(protocol as any);
    await this.startPlugin(protocol.id);
    await this.connectToNodes();

    this.logger.debug("identity", "loading identity (client)");
    await this.load();
    this.nodeReconnectTimer = setInterval(
      this.connectToNodes.bind(this),
      this.keepAliveInterval
    );

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

    setTimeout(() => {
      // Skip garbage collection as repo API is not available in Helia
      // this.ipfs.repo.gc();
    }, 3000);
  }

  onPeerConnect(peer: Peer) {
    if (!peer?.role) return;
    this.logger.info("p2p", `peer connected ${this.peerReadable(peer)}`, {
      peer,
    });
    this.hasServerConnection = this.peers.getServerCount() > 0;

    // Only emit /peer/connect for non-server peers
    if (peer.role !== "server") {
      this.emit("/peer/connect", peer);
    }

    if (peer.role === "server") {
      this.emit("/server/connect", peer);
    }
    this.peers.updatePeer(peer.peerId.toString(), {
      connected: true,
    });
  }

  onPeerDisconnect(peer: Peer) {
    this.logger.info("p2p", `peer disconnected ${this.peerReadable(peer)}`, {
      peer,
    });
    await this.peers.updatePeer(peer.peerId.toString(), {
      connected: false,
    });
    await this.emit("/peer/disconnect", peer);
  }

  async connectToNodes() {
    await Promise.all(
      this.nodeAddresses.map((addr) => {
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
          const connected = await this.ipfs.libp2p
            .dial(multiaddr(addr))
            .then(() => true)
            .catch((err: Error) => {
              this.logger.error(
                "p2p",
                `error connecting to peer: ${err.message}`,
                {
                  peerId: peerIdStr,
                  error: err.message,
                  stack: err.stack,
                }
              );
              return false;
            });
          if (connected !== false) {
            await this.connect(peerId, "server").catch((err: Error) => {
              this.logger.error("p2p", "peer could not be dialed", {
                peerId: peerIdStr,
                error: err.message,
                stack: err.stack,
              });
            });
          } else {
            this.logger.error("p2p", "peer could not be dialed", {
              peerId: peerIdStr,
              localPeerId: this.ipfs.libp2p.peerId.toString(),
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

  save(forceRemote = false, forceImmediate = false) {
    if (this.saving) return;
    if (!this.identity.hasResolved || this.identity.resolving) {
      this.logger.warn("identity", "identity not resolved, refusing to save");
      return;
    }
    if (!this.hasUnsavedChanges() && !forceImmediate && !forceRemote) {
      this.logger.info("identity", "no changes to save");
      return;
    }
    // Skip online check as isOnline() is not available in Helia
    // if (!this.ipfs.isOnline()) {
    //   this.logger.error("ipfs", "ipfs is offline");
    //   return;
    // }

    this.saving = true;
    const savedSchemas: Record<string, JWE | SavedSchema> = {};
    await Promise.all(
      Object.entries(this.schemas).map(async ([name, schema]) => {
        const exported = await schema.export();
        if (exported) {
          savedSchemas[name] = exported;
        }
      })
    );

    if (!Object.keys(savedSchemas).length) {
      this.logger.warn("identity", "no schemas to save");
      this.saving = false;
      return;
    }

    const rootDoc = {
      schemas: savedSchemas,
      updatedAt: Date.now(),
    };
    this.logger.info("identity", "saving root document", { rootDoc });

    // download the root doc in the browser
    // const anchor = document.createElement("a");
    // anchor.href = `data:text/json;charset=utf-8,${encodeURIComponent(
    //   JSON.stringify(rootDoc, null, 2)
    // )}`;
    // anchor.download = "root.json";
    // anchor.click();

    const rootCID = await this.dag
      .storeEncrypted(rootDoc)
      .catch((err: Error) => {
        this.logger.error("identity", "error saving root document", {
          error: err.message,
          stack: err.stack,
        });
        return null;
      });
    if (rootCID && rootCID.toString() !== this.identity.cid?.toString()) {
      this.logger.info("identity", "saved root document", { rootCID });
      console.info("saved root document", { rootCID });
      await this.identity.save({
        cid: rootCID,
        document: rootDoc,
        forceRemote,
        forceImmediate,
      });
    }
    this.saving = false;
  }

  load() {
    this.logger.info("client", "loading client");
    if (!this.hasServerConnection && this.role !== "server") {
      this.logger.info("p2p", "waiting for server connection", {
        timeout: this.initialConnectTimeout,
      });
      await new Promise((resolve) => {
        const onPeerConnect = (peer: Peer) => {
          if (peer.role === "server") {
            this.logger.info("p2p", "server connected", { peer });
            this.hasServerConnection = true;
            clearTimeout(timeout);
            this.off("/server/connect", onPeerConnect);
            resolve(true);
          }
        };
        const timeout = setTimeout(() => {
          this.logger.warn("p2p", "timed out waiting for server");
          this.off("/server/connect", onPeerConnect);
          resolve(false);
        }, this.initialConnectTimeout);
        this.on("/server/connect", onPeerConnect);
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
        Object.entries(document.schemas).map(([name, schema]) => {
          let saved: SavedSchema | undefined = undefined;
          if (typeof schema === "string") {
            // legacy schema support from CID
            this.logger.debug("identity", "loading schema from CID", {
              name,
              schema,
            });
            saved = (await this.dag
              .loadDecrypted(CID.parse(schema), undefined, {
                timeout: 3000,
              })
              .catch(() =>
                this.dag
                  .load(CID.parse(schema), undefined, { timeout: 3000 })
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
    this.emit("/client/loaded", true);
  }

  connect(peerId: PeerId, role: PeerRole = "peer") {
    let peer: Peer;
    if (!this.peers.hasPeer(peerId.toString())) {
      peer = this.peers.addPeer(peerId, role);
    } else {
      peer = this.peers.getPeer(peerId.toString());
    }
    if (peer.peerId.toString() === this.ipfs.libp2p.peerId.toString()) {
      return;
    }
    if (peer.connected) {
      return;
    }
    const peerData = await this.ipfs.libp2p.peerStore.get(peerId).catch(() => null);
    if (peerData && peerData.addresses.length > 0) {
      this.logger.debug(
        "p2p",
        `connect - connecting to ${role}: ${peer.peerId}`,
        {
          addr: peerData.addresses[0]?.multiaddr?.toString(),
        }
      );
    } else {
      const relayAddr = `${this.relayAddresses[0]}/p2p-circuit/p2p/${peer.peerId}`;
      this.logger.debug(
        "p2p",
        `connect - connecting to peer: ${peer.peerId}, via relay: ${relayAddr}`
      );
      await this.ipfs.libp2p.peerStore.merge(peerId, {
        multiaddrs: [multiaddr(relayAddr)],
      });
    }
    const connected = await this.ipfs.libp2p
      .dial(peerId)
      .then(() => true)
      .catch((err: Error) => {
        this.logger.error(
          "p2p",
          `error connecting to peer: ${err.message}`,
          {
            peerId: peerId.toString(),
            error: err.message,
            stack: err.stack,
          }
        );
        return false;
      });
    if (connected) {
      await this.send<ProtocolEvents, "/cinderlink/keepalive">(
        peerId.toString(),
        {
          topic: "/cinderlink/keepalive",
          payload: {
            timestamp: Date.now(),
          },
        }
      );
    }
  }

  onPubsubMessage(evt: CustomEvent) {
    const message = evt as CustomEvent<any>;
    const peerId = message.detail.from;
    if (peerId.toString() === this.peerId?.toString()) {
      return;
    }

    let peer = this.peers.getPeer(peerId.toString());
    if (!peer) {
      peer = this.peers.addPeer(peerId, "peer");
    }

    const encodedPayload = json.decode(message.detail.data) as EncodedProtocolPayload;

    const decoded = await decodePayload(encodedPayload, this.did);

    if (!decoded.sender) {
      this.logger.warn("pubsub", "ignoring unidentifiable pubsub message", {
        message: decoded,
      });
      return;
    }

    if (!peer.did) {
      peer.did = decoded.sender;
      this.emit("/peer/authenticated", peer);
    }

    const incoming = {
      peer,
      topic: message.detail.topic,
      ...decoded,
    } as any;

    if (decoded.signed && decoded.sender) {
      const sender = await this.did.resolve(decoded.sender);
      if (sender) {
        peer.did = decoded.sender;
        this.emit("/peer/authenticated", peer);
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
    Topic extends keyof Events["send"] = keyof Events["send"]
  >(
    peerId: string,
    message: OutgoingP2PMessage<Events, Topic>,
    encoding: EncodingOptions = {
      sign: true,
      encrypt: false,
    },
    options: {
      offline?: boolean;
      retries?: number;
      retryDelay?: number;
    } = {}
  ) {
    if (!this.ipfs?.libp2p) {
      this.logger.error("p2p", "send - libp2p not initialized");
      throw new Error("libp2p not initialized");
    }
    if (peerId === this.peerId?.toString()) return;
    if (!encoding.sign && !encoding.encrypt) {
      this.logger.error("p2p", "message must be signed or encrypted", {
        peerId,
        message,
        encoding,
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

    if (encoding.encrypt && !encoding.recipients) {
      if (!peer.did) {
        this.logger.error(
          "p2p",
          `send - peer not authenticated, unable to encrypt:  ${peerId}`
        );
        throw new Error(`Peer ${peerId} not authenticated`);
      }
      encoding.recipients = [peer.did as string];
    }

    const encoded = await encodePayload(
      message.payload as DecodedProtocolPayload<
        ProtocolRequest,
        EncodingOptions
      >,
      { ...encoding, did: this.did }
    );

    if (
      options.offline &&
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
      ).sendMessage(peer.did, message);
      return;
    }

    // check if we have a connection to the peer
    const connections = this.ipfs.libp2p.getConnections(peer.peerId);
    if (!connections || connections.length === 0) {
      const recovered = await this.ipfs.libp2p
        .dial(peer.peerId)
        .then(() => true)
        .catch((_: unknown) => {
          this.logger.error("p2p", `send - no connection to peer: ${peerId}`, {
            peerId,
            message,
          });
          return false;
        });
      if (recovered === false) {
        throw new Error(`No connection to peer ${peerId}`);
      }
    }

    const stream = await this.ipfs.libp2p
      ?.dialProtocol(peer.peerId, "/cinderlink/1.0.0")
      .catch((err: Error) => {
        if (!options.retries) {
          this.logger.error(
            "p2p",
            `failed to send message. unable to dial protocol; error: ${err.message}`,
            {
              peerId,
              message,
              stack: err.stack,
              options,
              connections,
            }
          );
        } else {
          this.logger.warn(
            "p2p",
            `message send error: ${err.message}, retrying in ${
              options.retryDelay || 1000
            }ms`,
            {
              peerId,
              message,
              stack: err.stack,
              options,
              connections,
            }
          );
        }
        return undefined;
      });

    if (stream === undefined) {
      if (options.retries && options.retries > 0) {
        setTimeout(() => {
          this.send(peerId, message, encoding, {
            ...options,
            retries: options.retries ? options.retries - 1 : 0,
          });
        }, options.retryDelay || 1000);
      }
      return;
    }

    pipe([json.encode({ ...message, ...encoded })], lp.encode, stream).catch(
      (error: Error) => {
        this.logger.error("p2p", "error sending message", {
          peerId,
          message,
          error,
        });
      }
    );
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
      const result = this.ipfs.libp2p.stop();
      if (result && typeof result.catch === 'function') {
        await result.catch(() => {});
      }
    });
  }

  get id() {
    return this.did.id;
  }

  subscribe(topic: keyof PluginEvents["subscribe"]) {
    if (this.subscriptions.includes(topic as string)) return;
    this.logger.debug("pubsub", `subscribing to topic: ${topic as string}`);
    const pubsub = this.ipfs.libp2p.services.pubsub as PubSubService | undefined;
    if (pubsub) {
      await pubsub.subscribe(topic as string);
    } else {
      this.logger.warn("pubsub", `cannot subscribe to ${topic as string} - pubsub not available`);
    }
    this.subscriptions.push(topic as string);
  }

  unsubscribe(topic: keyof PluginEvents["subscribe"]) {
    if (!this.subscriptions.includes(topic as string)) return;
    this.logger.debug("pubsub", `unsubscribing from topic: ${topic as string}`);
    const pubsub = this.ipfs.libp2p.services.pubsub as PubSubService | undefined;
    if (pubsub) {
      await pubsub.unsubscribe(topic as string);
    }
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
      Record<string, unknown>,
      typeof options
    >(message as Record<string, unknown>, { ...options, did: this.did });

    const bytes = json.encode(encoded);
    this.logger.debug(
      "pubsub",
      `publishing message on topic: ${topic as string} (length: ${
        bytes.length
      })`,
      { message, options }
    );
    try {
      const pubsub = this.ipfs.libp2p.services.pubsub as PubSubService | undefined;
      if (pubsub) {
        await pubsub.publish(topic as string, bytes);
      } else {
        this.logger.warn("pubsub", `cannot publish to ${topic as string} - pubsub not available`);
      }
    } catch (e) {
      this.logger.error("pubsub", "failed to publish message", {
        topic: topic as string,
        message,
        error: e instanceof Error ? e.message : String(e),
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
    message: OutgoingP2PMessage<Events, OutTopic>,
    options: Encoding = { sign: true, encrypt: false } as Encoding
  ): Promise<IncomingP2PMessage<Events, InTopic, Encoding> | undefined> {
    const peer = this.peers.getPeer(peerId);
    if (!peer) {
      throw new Error(`peer does not exist: ${peerId}`);
    }

    if (!options.sign && !options.encrypt) {
      this.logger.error("p2p", "request must be signed or encrypted", {
        peerId,
        message,
        options,
      });
      throw new Error("P2P request must be signed or encrypted");
    }

    const requestId = (message.payload as ProtocolRequest)?.requestId || uuid();
    const request: OutgoingP2PMessage<Events, OutTopic> = {
      topic: message.topic,
      payload: {
        ...(message.payload as Record<string, unknown>),
        requestId,
      } as Events["send"][OutTopic],
    } as OutgoingP2PMessage<Events, OutTopic>;

    const result = new Promise((resolve) => {
      const wait = this.once(`/cinderlink/request/${requestId}`);
      const _timeout = setTimeout(() => {
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
    await this.send<Events, keyof Events["send"]>(peerId, request, options);
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
