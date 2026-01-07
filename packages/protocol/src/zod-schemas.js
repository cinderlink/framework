import { z } from 'zod';
// Base schemas for common protocol types
export const peerInfoSchema = z.object({
    peerId: z.string(),
    did: z.string().optional(),
    addresses: z.array(z.string()).optional(),
    protocols: z.array(z.string()).optional()
});
export const timestampSchema = z.object({
    timestamp: z.number()
});
// Protocol event schemas
export const protocolSchemas = {
    send: {
        '/cinderlink/keepalive': timestampSchema,
        '/cinderlink/identity': z.object({
            did: z.string(),
            publicKey: z.string().optional()
        }),
        '/cinderlink/ping': timestampSchema,
        '/cinderlink/pong': z.object({
            timestamp: z.number(),
            latency: z.number()
        })
    },
    receive: {
        '/cinderlink/keepalive': timestampSchema,
        '/cinderlink/identity': z.object({
            did: z.string(),
            publicKey: z.string().optional()
        }),
        '/cinderlink/ping': timestampSchema,
        '/cinderlink/pong': z.object({
            timestamp: z.number(),
            latency: z.number()
        }),
        '/cinderlink/protocol': z.object({
            topic: z.string(),
            payload: z.unknown(),
            requestId: z.string().optional()
        })
    },
    publish: {
        '/peer/connect': z.object({
            did: z.string(),
            peerId: z.string()
        }),
        '/peer/disconnect': z.object({
            did: z.string(),
            peerId: z.string(),
            reason: z.string().optional()
        })
    },
    subscribe: {
        '/peer/connect': z.object({
            did: z.string().optional(),
            peerId: z.string()
        }),
        '/peer/disconnect': z.object({
            did: z.string().optional(),
            peerId: z.string(),
            reason: z.string().optional()
        })
    },
    emit: {
        'protocol:connected': peerInfoSchema,
        'protocol:disconnected': peerInfoSchema,
        'protocol:error': z.object({
            error: z.string(),
            peer: peerInfoSchema.optional(),
            context: z.record(z.string(), z.unknown()).optional()
        })
    }
};
//# sourceMappingURL=zod-schemas.js.map