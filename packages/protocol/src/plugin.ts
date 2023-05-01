import {
  EncodedProtocolPayload,
  DecodedProtocolMessage,
  EncodingOptions,
  IncomingP2PMessage,
  OutgoingP2PMessage,
  ProtocolEvents,
  ProtocolMessage,
  PluginInterface,
  ProtocolRequest,
  Peer,
  HandshakeRequest,
  PluginEventDef,
  PluginBaseInterface,
  ReceiveEventHandlers,
  SubLoggerInterface,
} from "@cinderlink/core-types";
import { Connection, Stream } from "@libp2p/interface-connection";
import * as json from "multiformats/codecs/json";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { Pushable, pushable } from "it-pushable";
import map from "it-map";
import { v4 as uuid } from "uuid";

import type { CinderlinkClientInterface } from "@cinderlink/core-types";
import { decodePayload, encodePayload } from "./encoding";

export interface ProtocolHandler {
  buffer: Pushable<Uint8Array>;
  stream: Stream;
  connection: Connection;
  out: Promise<void>;
  in: Promise<void>;
}

export class CinderlinkProtocolPlugin<
  PeerEvents extends PluginEventDef = {
    send: {};
    receive: {};
    emit: {};
    subscribe: {};
    publish: {};
  }
> implements PluginBaseInterface, PluginInterface<ProtocolEvents>
{
  id = "cinderlink";
  logger: SubLoggerInterface;
  started = false;

  constructor(
    public client: CinderlinkClientInterface<ProtocolEvents & PeerEvents>
  ) {
    this.logger = client.logger.module("protocol");
  }

  p2p: ReceiveEventHandlers<ProtocolEvents> = {
    "/cinderlink/handshake/request": this.onHandshakeRequest,
    "/cinderlink/handshake/challenge": this.onHandshakeChallenge,
    "/cinderlink/handshake/complete": this.onHandshakeComplete,
    "/cinderlink/handshake/success": this.onHandshakeSuccess,
    "/cinderlink/handshake/error": this.onHandshakeError,
  };

  pubsub = {};
  coreEvents = {
    "/peer/connect": this.onPeerConnect,
    "/peer/disconnect": this.onPeerDisconnect,
  };
  ProtocolEvents = {};
  handshakeInterval: NodeJS.Timeout | undefined;
  protocolHandlers: Record<
    string,
    { incoming?: ProtocolHandler; outgoing?: ProtocolHandler }
  > = {};

  async start() {
    this.logger.info(`registering protocol /cinderlink/1.0.0`);
    await this.client.ipfs.libp2p.handle(
      "/cinderlink/1.0.0",
      async ({ stream, connection }) => {
        await this.initializeProtocol(stream as any, connection as any);
      },
      {
        maxInboundStreams: 128,
        maxOutboundStreams: 128,
      }
    );

    this.handshakeInterval = setInterval(
      this.handshakeIntervalHandler.bind(this),
      3000
    );
  }
  async stop() {}

  async handshakeIntervalHandler() {
    for (const peer of this.client.peers.getPeers()) {
      if (peer.connected && !peer.authenticatedWith) {
        await this.client.send<ProtocolEvents>(peer.peerId.toString(), {
          topic: "/cinderlink/handshake/request",
          payload: {
            did: this.client.id,
          } as HandshakeRequest,
        });
      }
    }
  }

  async initializeProtocol(
    stream: Stream,
    connection: Connection,
    incoming = false
  ) {
    if (
      !connection.remotePeer?.toString() ||
      (this.client.peerId && connection.remotePeer.equals(this.client.peerId))
    )
      return;
    let peer = this.client.peers.getPeer(connection.remotePeer.toString());
    if (!peer) {
      peer = this.client.peers.addPeer(connection.remotePeer, "peer");
    }

    const existing =
      this.protocolHandlers[peer.peerId.toString()]?.[
        incoming ? "incoming" : "outgoing"
      ];

    if (existing) {
      this.logger.info(
        `initializeProtocol: ${
          incoming ? "incoming" : "outgoing"
        } protocol handler exists for peer ${readablePeer(peer)}`
      );

      await this.client.send<ProtocolEvents>(peer.peerId.toString(), {
        topic: "/cinderlink/handshake/request",
        payload: {
          did: this.client.id,
        } as HandshakeRequest,
      });
      return;
    }

    try {
      const self = this;
      const buffer = pushable();

      if (!this.protocolHandlers[peer.peerId.toString()]) {
        this.protocolHandlers[peer.peerId.toString()] = {
          incoming: undefined,
          outgoing: undefined,
        };
      }

      this.protocolHandlers[peer.peerId.toString()][
        incoming ? "incoming" : "outgoing"
      ] = {
        buffer,
        stream,
        out: pipe(buffer, lp.encode, stream.sink),
        in: pipe(
          stream.source,
          lp.decode,
          (source) => {
            return map(source, (buf) => {
              return json.decode<
                ProtocolMessage<
                  ProtocolEvents["receive"][keyof ProtocolEvents["receive"]] &
                    ProtocolRequest,
                  keyof ProtocolEvents["receive"]
                >
              >(buf.subarray());
            });
          },
          async function (source) {
            try {
              for await (const encoded of source) {
                await self.handleProtocolMessage(connection, encoded);
              }
            } catch (error: any) {
              self.logger.error(`initializeProtocol: error`, {
                message: error.message,
                trace: error.trace,
              });
            }
          }
        ),
      } as ProtocolHandler;

      this.logger.info(
        `initializeProtocol: initialized protocol with ${readablePeer(
          peer
        )}, sending handshake request`
      );

      await this.client.send<ProtocolEvents>(peer.peerId.toString(), {
        topic: "/cinderlink/handshake/request",
        payload: {
          did: this.client.id,
        } as HandshakeRequest,
      });
    } catch (error: any) {
      this.logger.error(`initializeProtocol: error`, {
        message: error.message,
        trace: error.trace,
      });
    }
  }

  async onPeerConnect(peer: Peer) {
    if (this.client.peerId && peer.peerId.equals(this.client.peerId)) {
      return;
    }

    if (!this.protocolHandlers[peer.peerId.toString()]) {
      const stream = await this.client.ipfs.libp2p.dialProtocol(
        peer.peerId,
        "/cinderlink/1.0.0"
      );
      const connection = this.client.ipfs.libp2p.getConnections(peer.peerId)[0];
      await this.initializeProtocol(stream, connection, false);
    }
  }

  async onPeerDisconnect(peer: Peer) {
    if (this.protocolHandlers[peer.peerId.toString()]) {
      this.logger.info(
        `onPeerDisconnect:  closing cinderlink protocol ${readablePeer(peer)}`
      );

      const outgoing = this.protocolHandlers[peer.peerId.toString()].outgoing;
      if (outgoing) {
        outgoing.buffer?.end();
        outgoing.stream?.close();
        outgoing.connection?.close();
      }
      const incoming = this.protocolHandlers[peer.peerId.toString()].incoming;
      if (incoming) {
        incoming.buffer?.end();
        incoming.stream?.close();
        incoming.connection?.close();
      }
      delete this.protocolHandlers[peer.peerId.toString()];
    }
  }

  async handleProtocolMessage<
    Events extends PluginEventDef = ProtocolEvents,
    Topic extends keyof Events["receive"] = keyof Events["receive"],
    Encoding extends EncodingOptions = EncodingOptions
  >(
    connection: Connection,
    encoded: ProtocolMessage<Events["receive"][Topic], Topic, Encoding>
  ) {
    if (!encoded) {
      this.logger.error(`invalid encoded message`, {
        from: connection.remotePeer,
        encoded,
      });
      throw new Error("invalid encoded message");
    }

    const { topic } = encoded;
    if (!topic) {
      this.logger.error(`invalid topic in encoded message`, {
        from: connection.remotePeer,
        encoded,
      });
      throw new Error('missing "topic" in encoded message');
    }

    const peer = this.client.peers.getPeer(connection.remotePeer.toString());
    if (!peer) {
      this.logger.error(`peer not found`, {
        from: connection.remotePeer,
        encoded,
      });
      throw new Error("peer not found");
    }

    const decoded = await decodePayload<
      Events["receive"][Topic],
      Encoding,
      EncodedProtocolPayload<Events["receive"][Topic], Encoding>
    >(encoded, this.client.did);
    if (!decoded) {
      throw new Error("failed to decode message (no data)");
      return;
    }

    const event: DecodedProtocolMessage<Events, "receive", Topic, Encoding> = {
      topic: topic as keyof Events["receive"],
      peer,
      ...decoded,
    } as DecodedProtocolMessage<Events, "receive", Topic, Encoding>;

    if ((event.payload as any)?.requestId) {
      this.client.emit(
        `/cinderlink/request/${(event.payload as any).requestId}`,
        event as any
      );
    }

    await this.client.p2p.emit(
      topic as keyof ProtocolEvents["receive"],
      event as any
    );
  }

  async encodeMessage<
    Topic extends keyof (
      | ProtocolEvents<ProtocolEvents>["send"]
      | ProtocolEvents<ProtocolEvents>["publish"]
    ) = keyof (
      | ProtocolEvents<ProtocolEvents>["send"]
      | ProtocolEvents<ProtocolEvents>["publish"]
    ),
    Encoding extends EncodingOptions = EncodingOptions
  >(
    message: OutgoingP2PMessage<ProtocolEvents, Topic>,
    { sign, encrypt, recipients }: Encoding = {} as Encoding
  ) {
    return encodePayload(message, {
      sign,
      encrypt,
      recipients,
      did: this.client.did,
    });
  }

  async onHandshakeRequest(
    message: IncomingP2PMessage<
      ProtocolEvents,
      "/cinderlink/handshake/request",
      EncodingOptions
    >
  ) {
    const peer = message.peer;
    if (!peer) {
      this.logger.info(`onHandshakeRequest: unknown peer`, {
        peer: message.peer,
      });
      return;
    }

    if (!message.payload?.did) {
      this.logger.info(`onHandshakeRequest: missing did in request`, {
        peerId: peer.peerId,
      });

      return;
    }

    if (peer.authenticated) {
      this.logger.info(`onHandshakeRequest: peer already authenticated`, {
        did: peer.did || "N/A",
      });

      return this.client.send<ProtocolEvents>(message.peer.peerId.toString(), {
        topic: "/cinderlink/handshake/success",
        payload: {},
      });
    } else if (peer.challengedAt && Date.now() - peer.challengedAt < 1000) {
      this.logger.warn(
        `onHandshakeRequest: challenge already issued for peer`,
        { peer }
      );

      return;
    }

    peer.did = message.payload.did;
    peer.challenge = uuid();
    peer.challengedAt = Date.now();
    this.client.peers.updatePeer(message.peer.peerId.toString(), peer);

    this.logger.info(`onHandshakeRequest: sending challenge to peer`, { peer });
    await this.client.send<ProtocolEvents>(
      message.peer.peerId.toString(),
      {
        topic: "/cinderlink/handshake/challenge",
        payload: {
          challenge: peer.challenge,
        },
      },
      { sign: true } as EncodingOptions
    );
  }

  async onHandshakeChallenge(
    message: IncomingP2PMessage<
      ProtocolEvents,
      "/cinderlink/handshake/challenge",
      EncodingOptions
    >
  ) {
    // send the challenge back to the peer
    const peer = message.peer;
    const logId = readablePeer(peer);
    if (!peer) {
      this.logger.info(`onHandshakeChallenge: unknown peer`, { logId });
      return;
    }

    this.logger.info(`onHandshakeChallenge: completing challenge for peer`, {
      logId,
    });

    await this.client.send<ProtocolEvents>(
      message.peer.peerId.toString(),
      {
        topic: "/cinderlink/handshake/complete",
        payload: {
          challenge: message.payload?.challenge,
        },
      },
      { sign: true } as EncodingOptions
    );
  }

  async onHandshakeComplete(
    message: IncomingP2PMessage<
      ProtocolEvents,
      "/cinderlink/handshake/complete",
      EncodingOptions
    >
  ) {
    const logId = readablePeer(message.peer);
    if (!message.signed) {
      this.logger.warn(`onHandshakeComplete: received unasigned message`, {
        from: logId,
      });

      return;
    }

    const peer = message.peer;
    if (!peer) {
      this.logger.warn(`onHandshakeComplete: unknown peer`, { logId });
      return;
    }

    if (message.payload?.challenge !== peer.challenge) {
      this.logger.warn(`onHandshakeComplete: invalid challenge response`, {
        from: readablePeer(peer),
        message,
      });

      return;
    }

    this.logger.info(`onHandshakeComplete: authenticating peer`, { peer });

    peer.did = message.peer.did || peer.did;
    peer.authenticated = true;
    peer.authenticatedAt = Date.now();
    peer.challengedAt = undefined;
    peer.challenge = undefined;

    this.client.peers.updatePeer(message.peer.peerId.toString(), peer);
    await this.client.send<ProtocolEvents>(
      message.peer.peerId.toString(),
      {
        topic: "/cinderlink/handshake/success",
        payload: {},
      },
      { sign: true } as EncodingOptions
    );
  }

  async onHandshakeError(
    message: IncomingP2PMessage<
      ProtocolEvents,
      "/cinderlink/handshake/error",
      EncodingOptions
    >
  ) {
    this.logger.warn(`onHandshakeError: received handshake error from peer`, {
      peer: message.peer,
    });
  }

  async onHandshakeSuccess(
    message: IncomingP2PMessage<
      ProtocolEvents,
      "/cinderlink/handshake/success",
      EncodingOptions
    >
  ) {
    const peer = message.peer;
    const logId = readablePeer(peer);
    if (!peer) {
      console.info(`p2p/handshake/success > unknown peer ${logId}`);
      return;
    }

    peer.authenticatedWith = true;
    peer.authenticatedWithAt = Date.now();
    peer.connected = true;
    this.client.peers.updatePeer(peer.peerId.toString(), peer);
    console.info(`p2p/handshake/success > authenticated ${logId}`);
    this.client.pluginEvents.emit("/cinderlink/handshake/success", peer as any);
    this.client.emit(`/${peer.role}/connect`, peer as any);
  }

  async sendHandshakeError(peerId: string, error: string) {
    await this.client.send<ProtocolEvents>(
      peerId,
      {
        topic: "/cinderlink/handshake/error",
        payload: {
          error,
        },
      },
      { sign: true, encrypt: false }
    );
  }
}

export function readablePeer(peer: Peer) {
  return `[peerId:${peer.peerId.toString()}, did:${
    peer.did ? peer.did : "N/A"
  }]`;
}

export default CinderlinkProtocolPlugin;
