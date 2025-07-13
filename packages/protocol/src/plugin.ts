import {
  EncodingOptions,
  OutgoingP2PMessage,
  ProtocolEvents,
  ProtocolMessage,
  PluginInterface,
  ProtocolRequest,
  Peer,
  PluginEventDef,
  ReceiveEventHandlers,
  SubLoggerInterface,
  IncomingP2PMessage,
  CinderlinkClientInterface,
  PluginEventHandlers,
  CinderlinkClientEvents,
} from "@cinderlink/core-types";
import { Connection, Stream } from "@libp2p/interface";
import * as json from "multiformats/codecs/json";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { Pushable } from "it-pushable";
import map from "it-map";

// Removed duplicate import - already imported above
import { decodePayload, encodePayload } from "./encoding.js";

export interface ProtocolHandler {
  buffer: Pushable<Uint8Array>;
  stream: Stream;
  connection: Connection;
  out: Promise<void>;
  in: Promise<void>;
}

export class CinderlinkProtocolPlugin<
  PeerEvents extends PluginEventDef = PluginEventDef
> implements PluginInterface<ProtocolEvents, PeerEvents, CinderlinkClientInterface<ProtocolEvents & PeerEvents>>
{
  id = "cinderlink";
  logger: SubLoggerInterface;
  keepAliveHandler: NodeJS.Timeout | undefined;
  respondToKeepAlive = true;
  started = false;

  constructor(
    public client: CinderlinkClientInterface<ProtocolEvents & PeerEvents>
  ) {
    this.logger = client.logger.module("protocol");
  }

  p2p: ReceiveEventHandlers<ProtocolEvents> = {
    "/cinderlink/keepalive": this.onKeepAlive.bind(this),
  };

  pubsub = {};
  coreEvents: Partial<PluginEventHandlers<CinderlinkClientEvents["emit"]>> = {
    "/peer/connect": this.onPeerConnect.bind(this),
    "/peer/disconnect": this.onPeerDisconnect.bind(this),
  };
  
  pluginEvents?: PluginEventHandlers<PeerEvents["emit"]>;

  start() {
    this.logger.info(`registering protocol /cinderlink/1.0.0`);
    this.client.ipfs.libp2p.handle(
      "/cinderlink/1.0.0",
      this.handleProtocol.bind(this),
      {
        maxInboundStreams: 128,
        maxOutboundStreams: 128,
      }
    );
    this.keepAliveHandler = setInterval(
      this.keepAliveCheck.bind(this),
      this.client.keepAliveInterval
    );
  }

  stop() {
    clearInterval(this.keepAliveHandler);
  }

  handleProtocol({
    stream,
    connection,
  }: {
    stream: Stream;
    connection: Connection;
  }) {
    const self = this;
    pipe(
      stream,
      lp.decode,
      (source: any) => {
        return map(source, (buf: any) => {
          return json.decode(buf) as ProtocolMessage<
            ProtocolEvents["receive"][keyof ProtocolEvents["receive"]] &
              ProtocolRequest,
            keyof ProtocolEvents["receive"]
          >;
        });
      },
      async function (source: any) {
        try {
          for await (const encoded of source) {
            await self.handleProtocolMessage(connection, encoded);
          }
        } catch (_error) {
          self.logger.error(`error handling protocol message`, {
            message: (error as Error).message,
            trace: (error as Error).stack,
          });
        }
      }
    ).catch((error: Error) => {
      self.logger.error(`error handling protocol message`, {
        message: error.message,
        trace: error.stack,
      });
    });
  }

  async keepAliveCheck() {
    const now = Date.now();
    for (const peer of this.client.peers.getAllPeers()) {
      if (peer.connected) {
        if (
          !peer.seenAt ||
          now - peer.seenAt >= (this.client.keepAliveTimeout || 10000)
        ) {
          this.logger.info(`peer ${readablePeer(peer)} timed out`);
          await this.client.emit("/cinderlink/keepalive/timeout", peer);
          try {
            this.client.ipfs.libp2p.getConnections(peer.peerId).forEach((connection: Connection) => {
              connection.close();
            });
            this.client.emit("/peer/disconnect", peer);
            this.client.peers.removePeer(peer.peerId.toString());
          } catch (__) {}
        } else {
          await this.client.send(peer.peerId.toString(), {
            topic: "/cinderlink/keepalive",
            payload: {
              timestamp: Date.now(),
            },
          } as OutgoingP2PMessage<ProtocolEvents, "/cinderlink/keepalive">);
        }
      }
    }
  }

  onKeepAlive(
    message: IncomingP2PMessage<
      ProtocolEvents,
      "/cinderlink/keepalive"
    >
  ) {
    if (!this.respondToKeepAlive) return;
    this.client.peers.updatePeer(message.peer.peerId.toString(), {
      seenAt: Date.now(),
    });
  }

  onPeerConnect(peer: Peer) {
    if (this.client.peerId && peer.peerId.equals(this.client.peerId)) {
      return;
    }
  }

  onPeerDisconnect(peer: Peer) {
    this.logger.info(`closing cinderlink protocol ${readablePeer(peer)}`);
  }

  async handleProtocolMessage(
    connection: Connection,
    encoded: ProtocolMessage<ProtocolRequest, string>
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

    let peer = this.client.peers.getPeer(connection.remotePeer.toString());
    if (!peer) {
      this.logger.warn(`peer not found, creating peer`, {
        from: connection.remotePeer,
        encoded,
      });
      peer = await this.client.peers.addPeer(connection.remotePeer, "peer");
    }

    if (!encoded.signed && !encoded.encrypted) {
      this.logger.error(
        `invalid encoded message; must be signed or encrypted`,
        {
          from: connection.remotePeer,
          encoded,
        }
      );
      throw new Error("invalid encoded message; must be signed or encrypted");
    }

    const decoded = await decodePayload(encoded, this.client.did);
    if (!decoded) {
      this.logger.error("failed to decode message (no data)", {
        encoded,
        decoded,
      });
      throw new Error("failed to decode message (no data)");
      return;
    }

    if (!peer.did && decoded.sender) {
      peer.did = decoded.sender;
      this.client.emit("/peer/authenticated", peer);
    }

    const event = {
      topic,
      peer,
      ...decoded,
    };

    this.logger.info(
      `received protocol message on topic ${event.topic as string} from ${
        peer.did
      }`,
      event
    );
    if (event.payload && typeof event.payload === 'object' && 'requestId' in event.payload && event.payload.requestId) {
      this.logger.info(
        `received request message from ${peer.did}: ${event.payload.requestId}`
      );
      this.client.emit(
        `/cinderlink/request/${event.payload.requestId}`,
        event
      );
    }

    await (this.client.p2p.emit as any)(topic, event);
  }

  async encodeMessage<
    Topic extends keyof (
      | ProtocolEvents<ProtocolEvents>["send"]
      | ProtocolEvents<ProtocolEvents>["publish"]
    ) = keyof (
      | ProtocolEvents<ProtocolEvents>["send"]
      | ProtocolEvents<ProtocolEvents>["publish"]
    )
  >(
    message: OutgoingP2PMessage<ProtocolEvents, Topic>,
    { sign, encrypt, recipients }: EncodingOptions = {} as EncodingOptions
  ) {
    return encodePayload(message, {
      sign,
      encrypt,
      recipients,
      did: this.client.did,
    });
  }
}

export function readablePeer(peer: Peer) {
  return `[peerId:${peer.peerId.toString()}, did:${
    peer.did ? peer.did : "N/A"
  }]`;
}

export default CinderlinkProtocolPlugin;
