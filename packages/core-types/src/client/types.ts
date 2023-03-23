import type { IPFSWithLibP2P } from "../ipfs";
import type { IncomingP2PMessage, Peer } from "../p2p";
import type { DID } from "dids";
import { PluginEventDef } from "../plugin";
import {
  IdentityResolveRequest,
  IdentityResolveResponse,
  IdentitySetRequest,
  IdentitySetResponse,
} from "../identity/types";
import { IncomingPubsubMessage } from "../pubsub";
import { ProtocolRequest } from "../protocol";

export type CinderlinkConstructorOptions = {
  ipfs: IPFSWithLibP2P;
  did: DID;
  address: string;
  addressVerification: string;
};

export interface CinderlinkClientEvents<
  PluginEvents extends PluginEventDef = PluginEventDef
> extends PluginEventDef {
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
  emit: {
    "/client/ready": ProtocolRequest;
    "/peer/connect": Peer;
    "/peer/disconnect": Peer;
    "/peer/handshake": Peer;
    "/peer/message": IncomingP2PMessage<PluginEvents>;
    "/pubsub/message": IncomingPubsubMessage<PluginEvents>;
  };
}
