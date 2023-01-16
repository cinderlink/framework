import { DID } from "dids";
import { IPFSWithLibP2P } from "../ipfs";
import { Peer } from "../p2p";
import { PubsubMessage } from "../pubsub";

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
