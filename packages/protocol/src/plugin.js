import * as json from "multiformats/codecs/json";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import map from "it-map";
// Removed duplicate import - already imported above
import { decodePayload, encodePayload } from "./encoding.js";
export class CinderlinkProtocolPlugin {
    client;
    id = "cinderlink";
    logger;
    keepAliveHandler;
    respondToKeepAlive = true;
    started = false;
    constructor(client) {
        this.client = client;
        this.logger = client.logger.module("protocol");
    }
    p2p = {
        "/cinderlink/keepalive": this.onKeepAlive.bind(this),
    };
    pubsub = {};
    coreEvents = {
        "/peer/connect": this.onPeerConnect.bind(this),
        "/peer/disconnect": this.onPeerDisconnect.bind(this),
    };
    pluginEvents;
    async start() {
        this.logger.info(`registering protocol /cinderlink/1.0.0`);
        this.client.ipfs.libp2p.handle("/cinderlink/1.0.0", this.handleProtocol.bind(this), {
            maxInboundStreams: 128,
            maxOutboundStreams: 128,
        });
        this.keepAliveHandler = setInterval(this.keepAliveCheck.bind(this), this.client.keepAliveInterval);
    }
    async stop() {
        clearInterval(this.keepAliveHandler);
    }
    handleProtocol({ stream, connection, }) {
        const self = this;
        pipe(stream, lp.decode, (source) => {
            return map(source, (buf) => {
                return json.decode(buf);
            });
        }, async function (source) {
            try {
                for await (const encoded of source) {
                    await self.handleProtocolMessage(connection, encoded);
                }
            }
            catch (_error) {
                self.logger.error(`error handling protocol message`, {
                    message: _error.message,
                    trace: _error.stack,
                });
            }
        }).catch((error) => {
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
                if (!peer.seenAt ||
                    now - peer.seenAt >= (this.client.keepAliveTimeout || 10000)) {
                    this.logger.info(`peer ${readablePeer(peer)} timed out`);
                    await this.client.emit("/cinderlink/keepalive/timeout", peer);
                    try {
                        this.client.ipfs.libp2p.getConnections(peer.peerId).forEach((connection) => {
                            connection.close();
                        });
                        this.client.emit("/peer/disconnect", peer);
                        this.client.peers.removePeer(peer.peerId.toString());
                    }
                    catch (__) { }
                }
                else {
                    await this.client.send(peer.peerId.toString(), {
                        topic: "/cinderlink/keepalive",
                        payload: {
                            timestamp: Date.now(),
                        },
                    });
                }
            }
        }
    }
    onKeepAlive(message) {
        if (!this.respondToKeepAlive)
            return;
        this.client.peers.updatePeer(message.peer.peerId.toString(), {
            seenAt: Date.now(),
        });
    }
    onPeerConnect(peer) {
        if (this.client.peerId && peer.peerId.equals(this.client.peerId)) {
            return;
        }
    }
    onPeerDisconnect(peer) {
        this.logger.info(`closing cinderlink protocol ${readablePeer(peer)}`);
    }
    async handleProtocolMessage(connection, encoded) {
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
            this.logger.error(`invalid encoded message; must be signed or encrypted`, {
                from: connection.remotePeer,
                encoded,
            });
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
        this.logger.info(`received protocol message on topic ${event.topic} from ${peer.did}`, event);
        if (event.payload && typeof event.payload === 'object' && 'requestId' in event.payload && event.payload.requestId) {
            this.logger.info(`received request message from ${peer.did}: ${event.payload.requestId}`);
            this.client.emit(`/cinderlink/request/${event.payload.requestId}`, event);
        }
        await this.client.p2p.emit(topic, event);
    }
    async encodeMessage(message, { sign, encrypt, recipients } = {}) {
        return encodePayload(message, {
            sign,
            encrypt,
            recipients,
            did: this.client.did,
        });
    }
}
export function readablePeer(peer) {
    return `[peerId:${peer.peerId.toString()}, did:${peer.did ? peer.did : "N/A"}]`;
}
export default CinderlinkProtocolPlugin;
//# sourceMappingURL=plugin.js.map