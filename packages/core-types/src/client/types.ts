import { HandshakeSuccess, HandshakeError } from "./../p2p/types";
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
import {
  IdentityResolveRequest,
  IdentityResolveResponse,
  IdentitySetRequest,
  IdentitySetResponse,
} from "../identity/types";

export type CandorConstructorOptions = {
  ipfs: IPFSWithLibP2P;
  did: DID;
};

export interface CandorClientEventDef extends PluginEventDef {
  send: {
    "/candor/handshake/request": HandshakeRequest;
    "/candor/handshake/challenge": HandshakeChallenge;
    "/candor/handshake/complete": HandshakeComplete;
    "/candor/handshake/success": HandshakeSuccess;
    "/candor/handshake/error": HandshakeError;
    "/identity/set/request": IdentitySetRequest;
    "/identity/resolve/request": IdentityResolveRequest;
    "/identity/resolve/response": IdentityResolveResponse;
    "/identity/set/response": IdentitySetResponse;
  };
  receive: {
    "/candor/handshake/request": HandshakeRequest;
    "/candor/handshake/challenge": HandshakeChallenge;
    "/candor/handshake/complete": HandshakeComplete;
    "/candor/handshake/success": HandshakeSuccess;
    "/candor/handshake/error": HandshakeError;
    "/identity/set/request": IdentitySetRequest;
    "/identity/resolve/request": IdentityResolveRequest;
    "/identity/resolve/response": IdentityResolveResponse;
    "/identity/set/response": IdentitySetResponse;
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
