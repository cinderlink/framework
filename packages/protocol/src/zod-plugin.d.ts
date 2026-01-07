import { ZodPluginBase, TypedIncomingMessage, EventPayloadType, type CinderlinkClientInterface } from '@cinderlink/core-types';
import { protocolSchemas } from './zod-schemas.js';
/**
 * Cinderlink Protocol Plugin implemented with Zod validation
 *
 * This plugin handles the core Cinderlink protocol for P2P communication,
 * including identity exchange, keepalive messages, and request routing.
 */
export declare class CinderlinkProtocolZodPlugin extends ZodPluginBase<typeof protocolSchemas, CinderlinkClientInterface> {
    private keepAliveTimers;
    constructor(client: CinderlinkClientInterface);
    start(): Promise<void>;
    stop(): Promise<void>;
    /**
     * Handle incoming protocol streams
     */
    private handleProtocol;
    /**
     * Handle a single protocol message
     */
    private handleProtocolMessage;
    /**
     * Handle keepalive messages
     */
    private handleKeepAlive;
    /**
     * Handle identity messages
     */
    private handleIdentity;
    /**
     * Handle ping messages
     */
    private handlePing;
    /**
     * Handle pong messages
     */
    private handlePong;
    /**
     * Get validated event handlers
     */
    protected getEventHandlers(): {
        pubsub: {
            '/peer/connect': (message: TypedIncomingMessage<EventPayloadType<typeof protocolSchemas, "subscribe", "/peer/connect">>) => void;
            '/peer/disconnect': (message: TypedIncomingMessage<EventPayloadType<typeof protocolSchemas, "subscribe", "/peer/disconnect">>) => void;
        };
    };
}
/**
 * Create a Cinderlink protocol plugin instance
 */
export declare function createProtocolPlugin(): typeof CinderlinkProtocolZodPlugin;
//# sourceMappingURL=zod-plugin.d.ts.map