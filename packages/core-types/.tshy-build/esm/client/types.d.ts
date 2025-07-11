import type { IPFSWithLibP2P } from "../ipfs";
import type { IncomingP2PMessage, Peer, PeerRole } from "../p2p";
import type { DID } from "dids";
import { PluginEventDef } from "../plugin";
import { IdentityResolved, IdentityResolveRequest, IdentityResolveResponse, IdentitySetRequest, IdentitySetResponse, PeerConnectMessage, PeerDisconnectMessage } from "../identity/types";
import { IncomingPubsubMessage } from "../pubsub";
import { ProtocolRequest } from "../protocol";
import { LoggerInterface } from "../logger";
export type CinderlinkConstructorOptions = {
    ipfs: IPFSWithLibP2P;
    did: DID;
    address: `0x${string}`;
    addressVerification: string;
    role: PeerRole;
    logger?: LoggerInterface;
};
export interface CinderlinkClientEvents<PluginEvents extends PluginEventDef = PluginEventDef> extends PluginEventDef {
    send: {
        "/identity/set/request": IdentitySetRequest;
        "/identity/resolve/request": IdentityResolveRequest;
        "/identity/resolve/response": IdentityResolveResponse;
        "/identity/set/response": IdentitySetResponse;
    };
    receive: {
        "/identity/set/request": IdentitySetRequest;
        "/identity/resolve/request": IdentityResolveRequest;
        "/identity/resolve/response": IdentityResolveResponse;
        "/identity/set/response": IdentitySetResponse;
    };
    publish: {
        "/peer/connect": PeerConnectMessage;
        "/peer/disconnect": PeerDisconnectMessage;
    };
    emit: {
        "/client/ready": ProtocolRequest;
        "/client/loaded": boolean;
        "/peer/connect": Peer;
        "/server/connect": Peer;
        "/peer/disconnect": Peer;
        "/peer/handshake": Peer;
        "/peer/authenticated": Peer;
        "/peer/message": IncomingP2PMessage<PluginEvents>;
        "/pubsub/message": IncomingPubsubMessage<PluginEvents>;
        "/identity/resolved": IdentityResolved;
    };
}
//# sourceMappingURL=types.d.ts.map