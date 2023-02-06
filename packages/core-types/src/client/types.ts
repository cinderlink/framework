import type { IPFSWithLibP2P } from "../ipfs";
import type {
  HandshakeRequest,
  HandshakeChallenge,
  HandshakeComplete,
  Peer,
} from "../p2p";
import type { PubsubMessage } from "../pubsub";
import type { DID } from "dids";
import { PluginEventDef } from "../plugin";

export type IdentityResolveRequest = {
  requestID: string;
  since: number;
};

export type IdentityResolveResponse = {
  requestID: string;
  cid?: string;
  doc?: Record<string, unknown>;
};

export type CandorConstructorOptions = {
  ipfs: IPFSWithLibP2P;
  did: DID;
};

export interface CandorClientEventDef extends PluginEventDef {
  send: {
    "/candor/handshake/request": HandshakeRequest;
    "/candor/handshake/challenge": HandshakeChallenge;
    "/candor/handshake/complete": HandshakeComplete;
    "/identity/resolve/request": IdentityResolveRequest;
    "/identity/resolve/response": IdentityResolveResponse;
  };
  receive: {
    "/candor/handshake/request": HandshakeRequest;
    "/candor/handshake/challenge": HandshakeChallenge;
    "/candor/handshake/complete": HandshakeComplete;
    "/identity/resolve/request": IdentityResolveRequest;
    "/identity/resolve/response": IdentityResolveResponse;
  };
  emit: {
    "/client/ready": undefined;
    "/peer/connect": Peer;
    "/peer/disconnect": Peer;
    "/peer/handshake": Peer;
    "/peer/message": {
      type: string;
      peer: Peer;
      message: unknown;
    };
    "/pubsub/message": PubsubMessage;
  };
}
