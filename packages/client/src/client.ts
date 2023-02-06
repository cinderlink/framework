import { Pushable } from "it-pushable";
import { pushable } from "it-pushable";
import type {
  Peer,
  P2PMessage,
  PubsubMessage,
  PubsubMessageEvents,
  PluginInterface,
  PluginEventDef,
  CandorConstructorOptions,
  SchemaInterface,
  SavedSchema,
  PluginEventHandler,
  HandshakeRequest,
  HandshakeChallenge,
  HandshakeComplete,
  OutgoingP2PMessage,
  EncodedP2PMessage,
  CandorClientInterface,
  PeerStoreInterface,
  P2PMessageEvents,
  CandorClientEventDef,
  PeerRole,
  HandshakeError,
  HandshakeSuccess,
} from "@candor/core-types";
import type { Connection, Stream } from "@libp2p/interface-connection";
import Emittery from "emittery";
import * as json from "multiformats/codecs/json";
import { pipe } from "it-pipe";
import * as lp from "it-length-prefixed";
import map from "it-map";
import { PeerId } from "@libp2p/interface-peer-id";
import type { IPFSWithLibP2P } from "./ipfs/types";
import { Peerstore } from "./peerstore";
import { ClientDIDDag } from "./dag";
import { Identity } from "./identity";
import { Schema } from "@candor/ipld-database";
import type { DagJWS, DID, VerifyJWSResult } from "dids";
import { v4 as uuid } from "uuid";
import { JWE } from "did-jwt";

export class CandorClient<PluginEvents extends PluginEventDef = PluginEventDef>
  extends Emittery<CandorClientEventDef["emit"]>
  implements CandorClientInterface<PluginEvents>
{
  public plugins: Record<
    PluginInterface["id"],
    PluginInterface<PluginEventDef>
  >;
  public protoStreams: Record<
    string,
    Pushable<json.ByteView<EncodedP2PMessage>>
  > = {};
  public pluginEvents: Emittery<PluginEvents["emit"]> = new Emittery();
  public started = false;
  public hasServerConnection = false;
  public peers: PeerStoreInterface = new Peerstore();
  public subscriptions: string[] = [];

  public pubsub: Emittery<PubsubMessageEvents<PluginEvents["subscribe"]>> =
    new Emittery();
  public p2p: Emittery<
    P2PMessageEvents<PluginEvents["receive"]> &
      P2PMessageEvents<CandorClientEventDef["receive"]>
  > = new Emittery();

  public ipfs: IPFSWithLibP2P;
  public did: DID;
  public peerId?: PeerId;
  public dag: ClientDIDDag;
  public schemas: Record<string, SchemaInterface> = {};
  public identity: Identity<PluginEvents>;
  public relayAddresses: string[] = [];

  constructor({ ipfs, did }: CandorConstructorOptions) {
    super();
    this.ipfs = ipfs;
    this.did = did;
    this.dag = new ClientDIDDag<PluginEvents>(this);
    this.identity = new Identity<PluginEvents>(this);
    this.plugins = {};
  }

  async addPlugin<
    T extends PluginInterface<PluginEventDef> = PluginInterface<PluginEventDef>
  >(plugin: T) {
    this.plugins[plugin.id] = plugin;
  }

  getPlugin<
    T extends PluginInterface<PluginEventDef> = PluginInterface<PluginEventDef>
  >(id: string) {
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

    console.info(`client > registering protocol /candor/1.0.0`);
    // on peer message
    await this.ipfs.libp2p.handle(
      "/candor/1.0.0",
      this.handleCandorProtocol.bind(this)
    );
    await this.load();

    console.info(`client > registering libp2p listeners`);
    this.ipfs.libp2p.pubsub.addEventListener(
      "message",
      this.onPubsubMessage.bind(this)
    );

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
      this.peers.updatePeer(peerId, { connected: false });
      this.emit("/peer/disconnect", peer);
    });

    this.ipfs.libp2p.pubsub.addEventListener("subscription-change", (event) => {
      console.info("subscription change", event);
    });

    console.info(
      `plugins > ${Object.keys(this.plugins).length} plugins found}`
    );
    console.info(`plugins > initializing message handlers`);
    await Promise.all(
      Object.values(this.plugins).map(async (plugin: PluginInterface) => {
        await plugin.start?.();
        Object.entries(plugin.pubsub).forEach(([topic, handler]) => {
          this.pubsub.on(topic, (handler as PluginEventHandler).bind(plugin));
          this.subscribe(topic);
        });

        Object.entries(plugin.p2p).forEach(([topic, handler]) => {
          this.p2p.on(topic, (handler as PluginEventHandler).bind(plugin));
        });
      })
    );

    console.info(`client > ready`);
    this.emit("/client/ready", undefined);
  }

  async connect(peerId: PeerId, role: PeerRole = "peer") {
    if (!this.peers.hasPeer(peerId.toString())) {
      this.peers.addPeer(peerId, role);
    }
    await this.ipfs.libp2p.dial(peerId);
    const connection = this.ipfs.libp2p.getConnections(peerId)[0];
    const stream = await this.ipfs.libp2p.dialProtocol(peerId, "/candor/1.0.0");
    await this.handleCandorProtocol({ stream, connection });
  }

  async onConnect(peerId: PeerId) {
    console.info(`peer/connect > connected to ${peerId.toString()}`);
    this.peers.updatePeer(peerId.toString(), { connected: true });
  }

  async send<T extends Record<string, unknown> = Record<string, unknown>>(
    peerId: string,
    message: OutgoingP2PMessage<T>,
    {
      sign,
      encrypt,
      recipients,
    }: { sign?: boolean; encrypt?: boolean; recipients?: string[] } = {}
  ) {
    if (!this.peers.hasPeer(peerId)) {
      console.warn(
        `p2p/out > refusing to send message to unknown peer ${peerId}`
      );
      return;
    }
    if (!this.protoStreams[peerId]) {
      this.protoStreams[peerId] = pushable();
    }

    const encoded: Partial<EncodedP2PMessage> = {
      topic: message.topic,
    };
    if (sign) {
      const jws = await this.did.createJWS(message);
      encoded.payload = jws;
      encoded.signed = true;
    } else if (encrypt && recipients) {
      encoded.payload = await this.did.createJWE(
        json.encode(encoded),
        recipients
      );
      encoded.encrypted = true;
    } else {
      encoded.payload = message.data;
    }

    this.protoStreams[peerId].push(json.encode(encoded as EncodedP2PMessage));
  }

  async handleCandorProtocol({
    stream,
    connection,
  }: {
    stream: Stream;
    connection: Connection;
  }) {
    const self = this;
    const peerId = connection.remotePeer.toString();
    const peer = this.peers.getPeer(peerId);

    if (!peer) {
      console.info(`p2p/in > ignoring message from unknown peer ${peerId}`);
      return;
    }

    if (!this.protoStreams[peerId]) {
      this.protoStreams[peerId] = pushable();
    }

    pipe(this.protoStreams[peerId], lp.encode(), stream.sink);
    pipe(
      stream.source,
      lp.decode(),
      (source) => {
        return map(source, (buf) => {
          return json.decode<EncodedP2PMessage>(buf.subarray());
        });
      },
      async function (source) {
        for await (const encoded of source) {
          const { topic, payload, signed, encrypted } = encoded;
          if (!topic) {
            console.info(`p2p/in > missing topic in message from ${peerId}`);
            return;
          }

          try {
            let data: Record<string, unknown> | undefined = undefined;
            const peer = self.peers.getPeer(connection.remotePeer.toString());

            if (!peer) {
              console.info(`p2p/in:${topic} > peer not found: ${peerId}`);
              return;
            }

            if (signed) {
              // convert array of ints to uint8array
              const verification: VerifyJWSResult | false = await self.did
                .verifyJWS(payload as DagJWS)
                .catch(() => false);
              if (verification && verification.payload) {
                data = verification.payload.data as Record<string, unknown>;
                peer.did = verification.didResolutionResult.didDocument?.id;
              } else {
                console.info(
                  `p2p/in:${topic} > failed to verify signed message from ${peerId}`
                );
                return;
              }
            } else if (encrypted) {
              const decrypted: json.ByteView<Record<string, unknown>> | false =
                await self.did.decryptJWE(payload as JWE).catch(() => false);
              if (!decrypted) {
                console.info(
                  `p2p/in:${topic} > failed to decrypt message from ${peerId}`
                );
                return;
              }
              data = json.decode(
                decrypted as json.ByteView<Record<string, unknown>>
              );
            } else {
              data = payload as Record<string, unknown>;
            }

            if (!data) {
              console.info(
                `p2p/in:${topic} > no payload data in message from ${peerId}`
              );
              return;
            }

            const event: P2PMessage = {
              topic,
              data,
              peerId: connection.remotePeer,
              peer,
              signed,
              encrypted,
            };

            if (topic === "/candor/handshake/request") {
              await self.onHandshakeRequest(
                event as P2PMessage<HandshakeRequest>
              );
            } else if (topic === "/candor/handshake/challenge") {
              await self.onHandshakeChallenge(
                event as P2PMessage<HandshakeChallenge>
              );
            } else if (topic === "/candor/handshake/complete") {
              await self.onHandshakeComplete(
                event as P2PMessage<HandshakeComplete>
              );
            } else if (topic === "/candor/handshake/success") {
              await self.onHandshakeSuccess(
                event as P2PMessage<HandshakeSuccess>
              );
            } else if (topic === "/candor/handshake/error") {
              await self.onHandshakeError(event as P2PMessage<HandshakeError>);
            } else if (event.peer.authenticated) {
              console.debug(
                `p2p/in:${topic} > from ${event.peerId}, data: `,
                event.data
              );
              await self.p2p.emit(topic as string, event as any);
            } else {
              console.warn("ignoring unauthenticated p2p message", {
                topic,
                data,
                peerId: connection.remotePeer,
                peer: self.peers.getPeer(connection.remotePeer.toString()),
              });
            }
          } catch (err) {
            console.error("error handling p2p stream", err);
          }
        }

        console.info(`p2p > stream ended by ${peerId}`);
      }
    );

    const protocols = await this.ipfs.libp2p.peerStore.protoBook.get(
      peer.peerId
    );
    await this.send(
      peerId,
      {
        topic: "/candor/handshake/request",
        data: {
          did: this.did.id,
          protocols: protocols.filter((p) => p.startsWith("/candor/")),
        },
      },
      { sign: true }
    );
  }

  async stop() {
    console.info(`stop > shutting down...`);
    await Promise.all(
      Object.values(this.plugins).map(async (plugin) => {
        await plugin.stop?.();
        Object.entries(plugin.pubsub).forEach(([topic, handler]) => {
          this.unsubscribe(topic);
          this.pubsub.off(topic, (handler as PluginEventHandler).bind(plugin));
        });
      })
    );

    await this.save();

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
  >(topic: K, message: PluginEvents["publish"][K]) {
    const encoded = json.encode(message);
    console.info(
      `pubsub/publish > topic "${topic as string}" (length: ${encoded.length})`
    );
    // console.debug(`pubsub/publish > topic: ${topic}, message:`, message)
    await this.ipfs.libp2p.pubsub.publish(topic as string, encoded);
  }

  async onHandshakeRequest(message: P2PMessage<HandshakeRequest>) {
    const peer = message.peer;
    if (!peer) {
      console.info(`p2p/handshake > unknown peer ${message.peerId}`);
      return;
    }

    if (peer.authenticated) {
      console.info(
        `p2p/handshake > already authenticated ${peer.peerId} (${
          peer.did ? peer.did : "N/A"
        })`
      );
      return this.send(message.peerId.toString(), {
        topic: "/candor/handshake/success",
        data: {},
      });
    } else if (peer.challengedAt && Date.now() - peer.challengedAt < 1000) {
      console.info(
        `p2p/handshake > challenge already issued to ${peer.peerId} (${
          peer.did ? peer.did : "N/A"
        })`
      );
      return this.send(
        message.peerId.toString(),
        {
          topic: "/candor/handshake/error",
          data: {
            error: "challenge already issued",
          },
        },
        { sign: true }
      );
    }

    peer.did = message.data.did;
    peer.challenge = uuid();
    peer.challengedAt = Date.now();
    this.peers.updatePeer(message.peerId.toString(), peer);

    console.info(
      `p2p/handshake > sending challenge to ${peer.peerId} (${
        peer.did ? peer.did : "N/A"
      })`
    );
    await this.send(
      message.peerId.toString(),
      {
        topic: "/candor/handshake/challenge",
        data: {
          challenge: peer.challenge,
        },
      },
      { sign: true }
    );
  }

  async onHandshakeChallenge(message: P2PMessage<HandshakeChallenge>) {
    // send the challenge back to the peer
    const peer = message.peer;
    if (!peer) {
      console.info(`p2p/handshake/challenge > unknown peer ${message.peerId}`);
      return;
    }

    console.info(
      `p2p/handshake/challenge > completing challenge for ${peer.peerId} (${
        peer.did ? peer.did : "N/A"
      })`
    );
    await this.send(
      message.peerId.toString(),
      {
        topic: "/candor/handshake/complete",
        data: {
          challenge: message.data.challenge,
        },
      },
      { sign: true }
    );
  }

  async onHandshakeComplete(message: P2PMessage<HandshakeComplete>) {
    if (!message.signed) {
      console.warn(
        `p2p/handshake/complete > received unsigned message from ${message.peerId}`
      );
      return;
    }

    const peer = message.peer;
    if (!peer) {
      console.warn(`p2p/handshake/complete > unknown peer ${message.peerId}`);
      return;
    }

    if (message.data.challenge !== peer.challenge) {
      console.warn(
        `p2p/handshake/complete > invalid challenge response from ${
          peer.peerId
        } (${peer.did ? peer.did : "N/A"})`
      );
      return;
    }

    console.info(
      `p2p/handshake/complete > authenticating ${peer.peerId} (${
        peer.did ? peer.did : "N/A"
      })`
    );
    peer.authenticated = true;
    peer.authenticatedAt = Date.now();
    peer.challengedAt = undefined;
    peer.challenge = undefined;

    this.peers.updatePeer(message.peerId.toString(), peer);
    await this.send(
      message.peerId.toString(),
      {
        topic: "/candor/handshake/success",
        data: {},
      },
      { sign: true }
    );
  }

  async sendHandshakeError(peerId: string, error: string) {
    await this.send(
      peerId,
      {
        topic: "/candor/handshake/error",
        data: {
          error,
        },
      },
      { sign: true }
    );
  }

  async onHandshakeError(message: P2PMessage<HandshakeError>) {
    console.warn(
      `p2p/handshake/error > received error from ${message.peerId} (${
        message.peer?.did ? message.peer.did : "N/A"
      })`,
      message.data.error
    );
  }

  async onHandshakeSuccess(message: P2PMessage<HandshakeSuccess>) {
    const peer = message.peer;
    if (!peer) {
      console.info(`p2p/handshake/success > unknown peer ${message.peerId}`);
      return;
    }

    console.info(`p2p/handshake/success > authenticated ${peer.peerId}`);
    this.emit("/peer/connect", peer);
  }

  async onPubsubMessage(message: any) {
    const msg = message.detail as PubsubMessage;
    if (msg.from === this.ipfs.libp2p.peerId) return;
    const peer = this.peers.getPeer(msg.from.toString());

    const decoded = json.decode<
      PluginEvents["subscribe"][keyof PluginEvents["subscribe"]]
    >(msg.data);

    const event = {
      ...msg,
      peer,
      data: decoded,
    };

    if (!peer || !peer.did || !peer.authenticated) {
      console.warn(
        `pubsub/message > received message from unauthenticated peer ${msg.from}`
      );
      return;
    }

    this.pubsub.emit(msg.topic, event as any);
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
    console.info(`save > encrypting root document`);
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
            const schema = await this.dag.loadDecrypted<SavedSchema>(schemaCID);
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

  hasSchema(name: string) {
    return this.schemas[name] !== undefined;
  }

  getSchema(name: string) {
    if (!this.hasSchema(name))
      throw new Error("schema does not exist: " + name);
    return this.schemas[name];
  }

  async addSchema(name: string, schema: Schema) {
    this.schemas[name] = schema;
    await this.save();
  }
}
export default CandorClient;
