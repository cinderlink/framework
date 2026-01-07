import { EncodingOptions, OutgoingP2PMessage, ProtocolEvents, ProtocolMessage, PluginInterface, ProtocolRequest, Peer, PluginEventDef, ReceiveEventHandlers, SubLoggerInterface, IncomingP2PMessage, CinderlinkClientInterface, PluginEventHandlers, CinderlinkClientEvents } from "@cinderlink/core-types";
import { Connection, Stream } from "@libp2p/interface";
import { Pushable } from "it-pushable";
export interface ProtocolHandler {
    buffer: Pushable<Uint8Array>;
    stream: Stream;
    connection: Connection;
    out: Promise<void>;
    in: Promise<void>;
}
export declare class CinderlinkProtocolPlugin<PeerEvents extends PluginEventDef = PluginEventDef> implements PluginInterface<ProtocolEvents, PeerEvents, CinderlinkClientInterface<ProtocolEvents & PeerEvents>> {
    client: CinderlinkClientInterface<ProtocolEvents & PeerEvents>;
    id: string;
    logger: SubLoggerInterface;
    keepAliveHandler: NodeJS.Timeout | undefined;
    respondToKeepAlive: boolean;
    started: boolean;
    constructor(client: CinderlinkClientInterface<ProtocolEvents & PeerEvents>);
    p2p: ReceiveEventHandlers<ProtocolEvents>;
    pubsub: {};
    coreEvents: Partial<PluginEventHandlers<CinderlinkClientEvents["emit"]>>;
    pluginEvents?: PluginEventHandlers<PeerEvents["emit"]>;
    start(): Promise<void>;
    stop(): Promise<void>;
    handleProtocol({ stream, connection, }: {
        stream: Stream;
        connection: Connection;
    }): void;
    keepAliveCheck(): Promise<void>;
    onKeepAlive(message: IncomingP2PMessage<ProtocolEvents, "/cinderlink/keepalive">): void;
    onPeerConnect(peer: Peer): void;
    onPeerDisconnect(peer: Peer): void;
    handleProtocolMessage(connection: Connection, encoded: ProtocolMessage<ProtocolRequest, string>): Promise<void>;
    encodeMessage<Topic extends keyof (ProtocolEvents<ProtocolEvents>["send"] | ProtocolEvents<ProtocolEvents>["publish"]) = keyof (ProtocolEvents<ProtocolEvents>["send"] | ProtocolEvents<ProtocolEvents>["publish"])>(message: OutgoingP2PMessage<ProtocolEvents, Topic>, { sign, encrypt, recipients }?: EncodingOptions): Promise<EncodedProtocolPayload<Data, Encoding>>;
}
export declare function readablePeer(peer: Peer): string;
export default CinderlinkProtocolPlugin;
//# sourceMappingURL=plugin.d.ts.map