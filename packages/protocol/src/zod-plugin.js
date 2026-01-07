import { ZodPluginBase } from '@cinderlink/core-types';
import * as lp from 'it-length-prefixed';
import { pipe } from 'it-pipe';
import * as json from 'multiformats/codecs/json';
import { protocolSchemas } from './zod-schemas.js';
import { decodePayload } from './encoding.js';
/**
 * Cinderlink Protocol Plugin implemented with Zod validation
 *
 * This plugin handles the core Cinderlink protocol for P2P communication,
 * including identity exchange, keepalive messages, and request routing.
 */
export class CinderlinkProtocolZodPlugin extends ZodPluginBase {
    keepAliveTimers = new Map();
    constructor(client) {
        super('cinderlink', client, protocolSchemas);
    }
    async start() {
        await this.initializeHandlers();
        this.logger.info('Starting Cinderlink protocol handler');
        // Register protocol handler with libp2p
        await this.client.ipfs.libp2p.handle('/cinderlink/1.0.0', this.handleProtocol.bind(this));
        // Subscribe to peer events
        await this.client.subscribe('/peer/connect');
        await this.client.subscribe('/peer/disconnect');
        this.started = true;
        this.logger.info('Protocol handler started');
    }
    async stop() {
        this.logger.info('Stopping protocol handler');
        // Clear all keepalive timers
        for (const timer of this.keepAliveTimers.values()) {
            clearTimeout(timer);
        }
        this.keepAliveTimers.clear();
        // Unregister protocol handler
        await this.client.ipfs.libp2p.unhandle('/cinderlink/1.0.0');
        // Unsubscribe from peer events
        await this.client.unsubscribe('/peer/connect');
        await this.client.unsubscribe('/peer/disconnect');
        this.started = false;
        this.logger.info('Protocol handler stopped');
    }
    /**
     * Handle incoming protocol streams
     */
    async handleProtocol({ stream, connection }) {
        const peerId = connection.remotePeer;
        try {
            await pipe(stream.source, lp.decode, async (source) => {
                for await (const msg of source) {
                    // Convert Uint8ArrayList to Uint8Array if needed
                    const data = msg.subarray ? msg.subarray() : new Uint8Array(msg);
                    await this.handleProtocolMessage(data, peerId);
                }
            });
        }
        catch (error) {
            this.logger.error('Protocol stream error', {
                peer: peerId.toString(),
                error: error instanceof Error ? error.message : String(error)
            });
            this.emit('protocol:error', {
                error: error instanceof Error ? error.message : String(error),
                peer: {
                    peerId: peerId.toString()
                }
            });
        }
        finally {
            stream.close();
        }
    }
    /**
     * Handle a single protocol message
     */
    async handleProtocolMessage(data, peerId) {
        try {
            const message = json.decode(data);
            const { topic, payload: encodedPayload } = message;
            // Decode the payload
            const decoded = await decodePayload(encodedPayload, this.client.did);
            if (!decoded.sender) {
                this.logger.warn('Ignoring message without sender', { peerId: peerId.toString() });
                return;
            }
            // Get or create peer
            let peer = this.client.peers.getPeer(peerId.toString());
            if (!peer) {
                peer = this.client.peers.addPeer(peerId, 'peer');
            }
            // Update peer DID if not set
            if (!peer.did && decoded.sender) {
                peer.did = decoded.sender;
                this.client.emit('/peer/authenticated', peer);
            }
            // Create incoming message
            const incoming = {
                peer,
                topic,
                ...decoded
            };
            // Handle specific protocol messages
            switch (topic) {
                case '/cinderlink/keepalive':
                    await this.handleKeepAlive(incoming);
                    break;
                case '/cinderlink/identity':
                    await this.handleIdentity(incoming);
                    break;
                case '/cinderlink/ping':
                    await this.handlePing(incoming);
                    break;
                case '/cinderlink/pong':
                    await this.handlePong(incoming);
                    break;
                default:
                    // Route to appropriate handler
                    if (topic.startsWith('/cinderlink/request/')) {
                        const requestId = decoded.payload?.requestId;
                        if (requestId) {
                            this.client.emit(`/cinderlink/request/${requestId}`, incoming);
                        }
                    }
                    else {
                        // Emit to P2P handlers
                        this.client.p2p.emit(topic, incoming);
                    }
            }
        }
        catch (error) {
            this.logger.error('Failed to handle protocol message', {
                peer: peerId.toString(),
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Handle keepalive messages
     */
    handleKeepAlive(message) {
        const peerId = message.peer.peerId.toString();
        // Validate payload
        const payload = this.validateEventPayload('receive', '/cinderlink/keepalive', message.payload);
        // Reset keepalive timer
        const existingTimer = this.keepAliveTimers.get(peerId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }
        const timer = setTimeout(() => {
            this.logger.warn('Peer keepalive timeout', { peerId });
            this.client.peers.updatePeer(peerId, { connected: false });
        }, this.client.keepAliveTimeout);
        this.keepAliveTimers.set(peerId, timer);
        // Update peer as connected
        this.client.peers.updatePeer(peerId, { connected: true });
    }
    /**
     * Handle identity messages
     */
    async handleIdentity(message) {
        const payload = this.validateEventPayload('receive', '/cinderlink/identity', message.payload);
        // Update peer identity
        this.client.peers.updatePeer(message.peer.peerId.toString(), {
            did: payload.did
        });
        // Send our identity back
        await this.send(message.peer.peerId.toString(), '/cinderlink/identity', {
            did: this.client.did.id,
            publicKey: this.client.did.id // In production, include actual public key
        });
    }
    /**
     * Handle ping messages
     */
    async handlePing(message) {
        const payload = this.validateEventPayload('receive', '/cinderlink/ping', message.payload);
        // Send pong response
        await this.send(message.peer.peerId.toString(), '/cinderlink/pong', {
            timestamp: Date.now(),
            latency: Date.now() - payload.timestamp
        });
    }
    /**
     * Handle pong messages
     */
    handlePong(message) {
        const payload = this.validateEventPayload('receive', '/cinderlink/pong', message.payload);
        this.logger.debug('Received pong', {
            peer: message.peer.peerId.toString(),
            latency: payload.latency
        });
    }
    /**
     * Get validated event handlers
     */
    getEventHandlers() {
        return {
            pubsub: {
                '/peer/connect': (message) => {
                    this.logger.debug('Peer connected via pubsub', message.payload);
                },
                '/peer/disconnect': (message) => {
                    this.logger.debug('Peer disconnected via pubsub', message.payload);
                    // Clear keepalive timer
                    const timer = this.keepAliveTimers.get(message.payload.peerId);
                    if (timer) {
                        clearTimeout(timer);
                        this.keepAliveTimers.delete(message.payload.peerId);
                    }
                }
            }
        };
    }
}
/**
 * Create a Cinderlink protocol plugin instance
 */
export function createProtocolPlugin() {
    return CinderlinkProtocolZodPlugin;
}
//# sourceMappingURL=zod-plugin.js.map