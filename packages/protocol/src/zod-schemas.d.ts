import { z } from 'zod';
export declare const peerInfoSchema: z.ZodObject<{
    peerId: z.ZodString;
    did: z.ZodOptional<z.ZodString>;
    addresses: z.ZodOptional<z.ZodArray<z.ZodString>>;
    protocols: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const timestampSchema: z.ZodObject<{
    timestamp: z.ZodNumber;
}, z.core.$strip>;
export declare const protocolSchemas: {
    send: {
        '/cinderlink/keepalive': z.ZodObject<{
            timestamp: z.ZodNumber;
        }, z.core.$strip>;
        '/cinderlink/identity': z.ZodObject<{
            did: z.ZodString;
            publicKey: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        '/cinderlink/ping': z.ZodObject<{
            timestamp: z.ZodNumber;
        }, z.core.$strip>;
        '/cinderlink/pong': z.ZodObject<{
            timestamp: z.ZodNumber;
            latency: z.ZodNumber;
        }, z.core.$strip>;
    };
    receive: {
        '/cinderlink/keepalive': z.ZodObject<{
            timestamp: z.ZodNumber;
        }, z.core.$strip>;
        '/cinderlink/identity': z.ZodObject<{
            did: z.ZodString;
            publicKey: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
        '/cinderlink/ping': z.ZodObject<{
            timestamp: z.ZodNumber;
        }, z.core.$strip>;
        '/cinderlink/pong': z.ZodObject<{
            timestamp: z.ZodNumber;
            latency: z.ZodNumber;
        }, z.core.$strip>;
        '/cinderlink/protocol': z.ZodObject<{
            topic: z.ZodString;
            payload: z.ZodUnknown;
            requestId: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    };
    publish: {
        '/peer/connect': z.ZodObject<{
            did: z.ZodString;
            peerId: z.ZodString;
        }, z.core.$strip>;
        '/peer/disconnect': z.ZodObject<{
            did: z.ZodString;
            peerId: z.ZodString;
            reason: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    };
    subscribe: {
        '/peer/connect': z.ZodObject<{
            did: z.ZodOptional<z.ZodString>;
            peerId: z.ZodString;
        }, z.core.$strip>;
        '/peer/disconnect': z.ZodObject<{
            did: z.ZodOptional<z.ZodString>;
            peerId: z.ZodString;
            reason: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>;
    };
    emit: {
        'protocol:connected': z.ZodObject<{
            peerId: z.ZodString;
            did: z.ZodOptional<z.ZodString>;
            addresses: z.ZodOptional<z.ZodArray<z.ZodString>>;
            protocols: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>;
        'protocol:disconnected': z.ZodObject<{
            peerId: z.ZodString;
            did: z.ZodOptional<z.ZodString>;
            addresses: z.ZodOptional<z.ZodArray<z.ZodString>>;
            protocols: z.ZodOptional<z.ZodArray<z.ZodString>>;
        }, z.core.$strip>;
        'protocol:error': z.ZodObject<{
            error: z.ZodString;
            peer: z.ZodOptional<z.ZodObject<{
                peerId: z.ZodString;
                did: z.ZodOptional<z.ZodString>;
                addresses: z.ZodOptional<z.ZodArray<z.ZodString>>;
                protocols: z.ZodOptional<z.ZodArray<z.ZodString>>;
            }, z.core.$strip>>;
            context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, z.core.$strip>;
    };
};
export type ProtocolEvents = z.infer<typeof protocolSchemas>;
//# sourceMappingURL=zod-schemas.d.ts.map