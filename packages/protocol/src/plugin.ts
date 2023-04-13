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

  constructor(
    public client: CinderlinkClientInterface<ProtocolEvents & PeerEvents>
  ) {}

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

  protocolHandlers: Record<string, ProtocolHandler> = {};

  async start() {
    console.info(`client > registering protocol /cinderlink/1.0.0`);
    await this.client.ipfs.libp2p.handle(
      "/cinderlink/1.0.0",
      async ({
        stream,
        connection,
      }: {
        stream: Stream;
        connection: Connection;
      }) => {
        await this.initializeProtocol(stream, connection);
      },
      {
        maxInboundStreams: 128,
        maxOutboundStreams: 128,
      }
    );
  }
  async stop() {}

  async initializeProtocol(
    stream: Stream,
    connection: Connection,
    force = false
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

    if (this.protocolHandlers[peer.peerId.toString()]?.connection && !force) {
      console.info(
        `protocol > already initialized protocol with ${readablePeer(peer)}`
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
      this.protocolHandlers[peer.peerId.toString()] = {
        buffer,
        stream,
        out: pipe(buffer, lp.encode(), stream.sink),
        in: pipe(
          stream.source,
          lp.decode(),
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
                console.info("protocol > received message", encoded);
                await self.handleProtocolMessage(connection, encoded);
              }
            } catch (e) {
              console.error(e);
            }
          }
        ),
      } as ProtocolHandler;

      console.info(
        `protocol > initialized protocol with ${readablePeer(
          peer
        )}, sending handshake request`
      );
      await this.client.send<ProtocolEvents>(peer.peerId.toString(), {
        topic: "/cinderlink/handshake/request",
        payload: {
          did: this.client.id,
        } as HandshakeRequest,
      });
    } catch (e) {
      console.error(e);
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
      await this.initializeProtocol(stream, connection);
    }
  }

  async onPeerDisconnect(peer: Peer) {
    if (this.protocolHandlers[peer.peerId.toString()]) {
      console.info(
        `peer/disconnect > closing cinderlink protocol ${readablePeer(peer)}`
      );
      this.protocolHandlers[peer.peerId.toString()].buffer?.end();
      this.protocolHandlers[peer.peerId.toString()].stream?.close();
      this.protocolHandlers[peer.peerId.toString()].connection?.close();
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
    if (!encoded?.topic) {
      console.warn(
        `p2p/in: ERROR: invalid topic > from ${connection.remotePeer}`,
        encoded
      );
      return;
    }
    console.info(
      `p2p/in:${encoded.topic as string} > from ${connection.remotePeer}`
    );
    const { topic } = encoded;
    if (!topic) {
      throw new Error('missing "topic" in encoded message');
    }

    const peer = this.client.peers.getPeer(connection.remotePeer.toString());
    if (!peer) {
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

    console.debug(
      `p2p/in:${topic as string} > from ${
        event.peer.did || event.peer.peerId.toString()
      }, data: `,
      event.payload
    );
    if ((topic as string).includes("sync")) {
      console.debug("sync", event.payload);
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
      console.info(`p2p/handshake > unknown peer ${message.peer}`);
      return;
    }

    if (!message.payload?.did) {
      console.info(
        `p2p/handshake > missing did in request from ${peer.peerId}`
      );
      return;
    }

    if (peer.authenticated) {
      console.info(
        `p2p/handshake > already authenticated ${peer.peerId} (${
          peer.did ? peer.did : "N/A"
        })`
      );
      return this.client.send<ProtocolEvents>(message.peer.peerId.toString(), {
        topic: "/cinderlink/handshake/success",
        payload: {},
      });
    } else if (peer.challengedAt && Date.now() - peer.challengedAt < 1000) {
      console.warn(
        `p2p/handshake > challenge already issued to ${peer.peerId} (${
          peer.did ? peer.did : "N/A"
        })`
      );
      return;
    }

    peer.did = message.payload.did;
    peer.challenge = uuid();
    peer.challengedAt = Date.now();
    this.client.peers.updatePeer(message.peer.peerId.toString(), peer);

    console.info(
      `p2p/handshake > sending challenge to ${peer.peerId} (${
        peer.did ? peer.did : "N/A"
      })`
    );
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
      console.info(`p2p/handshake/challenge > unknown peer ${logId}`);
      return;
    }

    console.info(
      `p2p/handshake/challenge > completing challenge for peer ${logId}`
    );
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
      console.warn(
        `p2p/handshake/complete > received unsigned message from ${logId}`
      );
      return;
    }

    const peer = message.peer;
    if (!peer) {
      console.warn(`p2p/handshake/complete > unknown peer ${logId}`);
      return;
    }

    if (message.payload?.challenge !== peer.challenge) {
      console.warn(
        `p2p/handshake/complete > invalid challenge response from ${readablePeer(
          peer
        )}: ${message.payload?.challenge} !== ${peer.challenge}`,
        message
      );
      return;
    }

    console.info(
      `p2p/handshake/complete > authenticating! ${peer.peerId} (${
        peer.did ? peer.did : "N/A"
      })`
    );
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
    console.warn(
      `p2p/handshake/error > received handshake error from peer ${readablePeer(
        message.peer
      )}`,
      message.payload?.error
    );
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
