import { CandorClientInterface, P2PMessage, Peer, PluginEventDef, EncodedP2PMessage } from '@candor/core-types';
import Emittery from 'emittery';
import { OfflineSyncClientEvents, OfflineSyncClientPluginInterface, OfflineSyncSendResponse, OfflineSyncGetResponse } from '@candor/plugin-offline-sync-core';

declare class OfflineSyncClientPlugin<PluginEvents extends OfflineSyncClientEvents = OfflineSyncClientEvents> extends Emittery<OfflineSyncClientEvents["emit"]> implements OfflineSyncClientPluginInterface {
    client: CandorClientInterface<PluginEvents>;
    options: Record<string, unknown>;
    id: string;
    updatedAt: number;
    interval: NodeJS.Timer | null;
    ready: boolean;
    p2p: {
        "/offline/send/response": (message: P2PMessage<string, OfflineSyncSendResponse>) => Promise<void>;
        "/offline/get/response": (response: P2PMessage<string, OfflineSyncGetResponse>) => Promise<void>;
    };
    pubsub: {};
    coreEvents: {
        "/peer/handshake": (peer: Peer) => Promise<void>;
    };
    constructor(client: CandorClientInterface<PluginEvents>, options?: Record<string, unknown>);
    start(): Promise<void>;
    stop(): Promise<void>;
    sendMessage<E extends PluginEventDef["send"] = PluginEventDef["send"], K extends keyof E = keyof E>(recipient: string, encoded: EncodedP2PMessage<E, K>): Promise<P2PMessage<string, {
        "/offline/send/response": OfflineSyncSendResponse;
        "/offline/get/response": OfflineSyncGetResponse;
    }>>;
    onPeerConnect(peer: Peer): Promise<void>;
    onSendResponse(message: P2PMessage<string, OfflineSyncSendResponse>): Promise<void>;
    onGetResponse(response: P2PMessage<string, OfflineSyncGetResponse>): Promise<void>;
}

export { OfflineSyncClientPlugin, OfflineSyncClientPlugin as default };
