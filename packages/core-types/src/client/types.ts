import type { IPFSWithLibP2P } from "../ipfs";
import type { Peer } from "../p2p";
import type { PubsubMessage } from "../pubsub";
import type { DID } from "dids";

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

export type CandorClientEvents = {
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
