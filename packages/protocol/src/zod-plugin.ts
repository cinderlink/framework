import { ZodPluginBase, TypedIncomingMessage, EventPayloadType, type CinderlinkClientInterface, type IncomingP2PMessage } from '@cinderlink/core-types';
import type { Stream } from '@libp2p/interface';
import * as lp from 'it-length-prefixed';
import { pipe } from 'it-pipe';
import map from 'it-map';
import * as json from 'multiformats/codecs/json';
import { protocolSchemas } from './zod-schemas.js';
import { decodePayload } from './encoding.js';

/**
 * Cinderlink Protocol Plugin implemented with Zod validation
 * 
 * This plugin handles the core Cinderlink protocol for P2P communication,
 * including identity exchange, keepalive messages, and request routing.
 */
export class CinderlinkProtocolZodPlugin extends ZodPluginBase<
  typeof protocolSchemas,
  CinderlinkClientInterface
> {
  private keepAliveTimers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(client: CinderlinkClientInterface) {
    super('cinderlink', client, protocolSchemas);
  }
  
  async start(): Promise<void> {
    await this.initializeHandlers();
    this.logger.info('Starting Cinderlink protocol handler');
    
    // Register protocol handler with libp2p
    await this.client.ipfs.libp2p.handle(
      '/cinderlink/1.0.0',
      this.handleProtocol.bind(this)
    );
    
    // Subscribe to peer events
    await (this.client as any).subscribe('/peer/connect');
    await (this.client as any).subscribe('/peer/disconnect');
    
    this.started = true;
    this.logger.info('Protocol handler started');
  }
  
  async stop(): Promise<void> {
    this.logger.info('Stopping protocol handler');
    
    // Clear all keepalive timers
    for (const timer of this.keepAliveTimers.values()) {
      clearTimeout(timer);
    }
    this.keepAliveTimers.clear();
    
    // Unregister protocol handler
    await this.client.ipfs.libp2p.unhandle('/cinderlink/1.0.0');
    
    // Unsubscribe from peer events
    await (this.client as any).unsubscribe('/peer/connect');
    await (this.client as any).unsubscribe('/peer/disconnect');
    
    this.started = false;
    this.logger.info('Protocol handler stopped');
  }
  
  /**
   * Handle incoming protocol streams
   */
  private async handleProtocol({ stream, connection }: { stream: Stream; connection: any }) {
    const peerId = connection.remotePeer;
    
    try {
      await pipe(
        stream.source,
        lp.decode,
        async (source: AsyncIterable<any>) => {
          for await (const msg of source) {
            // Convert Uint8ArrayList to Uint8Array if needed
            const data = msg.subarray ? msg.subarray() : new Uint8Array(msg);
            await this.handleProtocolMessage(data, peerId);
          }
        }
      );
    } catch (error) {
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
    } finally {
      stream.close();
    }
  }
  
  /**
   * Handle a single protocol message
   */
  private async handleProtocolMessage(data: Uint8Array, peerId: any) {
    try {
      const message = json.decode(data) as { topic: string; payload: any };
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
      const incoming: IncomingP2PMessage = {
        peer,
        topic,
        ...decoded
      } as any;
      
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
            const requestId = (decoded.payload as any)?.requestId;
            if (requestId) {
              (this.client as any).emit(`/cinderlink/request/${requestId}`, incoming);
            }
          } else {
            // Emit to P2P handlers
            (this.client.p2p as any).emit(topic, incoming);
          }
      }
    } catch (error) {
      this.logger.error('Failed to handle protocol message', {
        peer: peerId.toString(),
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Handle keepalive messages
   */
  private handleKeepAlive(message: IncomingP2PMessage) {
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
  private async handleIdentity(message: IncomingP2PMessage) {
    const payload = this.validateEventPayload('receive', '/cinderlink/identity', message.payload);
    
    // Update peer identity
    this.client.peers.updatePeer(message.peer.peerId.toString(), {
      did: payload.did
    });
    
    // Send our identity back
    await this.send(
      message.peer.peerId.toString(),
      '/cinderlink/identity',
      {
        did: this.client.did.id,
        publicKey: this.client.did.id // In production, include actual public key
      }
    );
  }
  
  /**
   * Handle ping messages
   */
  private async handlePing(message: IncomingP2PMessage) {
    const payload = this.validateEventPayload('receive', '/cinderlink/ping', message.payload);
    
    // Send pong response
    await this.send(
      message.peer.peerId.toString(),
      '/cinderlink/pong',
      {
        timestamp: Date.now(),
        latency: Date.now() - payload.timestamp
      }
    );
  }
  
  /**
   * Handle pong messages
   */
  private handlePong(message: IncomingP2PMessage) {
    const payload = this.validateEventPayload('receive', '/cinderlink/pong', message.payload);
    
    this.logger.debug('Received pong', {
      peer: message.peer.peerId.toString(),
      latency: payload.latency
    });
  }
  
  /**
   * Get validated event handlers
   */
  protected getEventHandlers() {
    return {
      pubsub: {
        '/peer/connect': (message: TypedIncomingMessage<EventPayloadType<typeof protocolSchemas, 'subscribe', '/peer/connect'>>) => {
          this.logger.debug('Peer connected via pubsub', message.payload);
        },
        
        '/peer/disconnect': (message: TypedIncomingMessage<EventPayloadType<typeof protocolSchemas, 'subscribe', '/peer/disconnect'>>) => {
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