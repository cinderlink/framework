import { JWE } from "did-jwt";
import { ProtocolRequest } from "./../protocol/types";
import { SavedSchema } from "../database";
export interface IdentityResolveRequest extends ProtocolRequest {
  requestId: string;
  since: number;
}

export interface IdentityResolveResponse extends ProtocolRequest {
  requestId: string;
  cid?: string;
  doc?: Record<string, unknown>;
  error?: string;
}

export interface IdentitySetRequest extends ProtocolRequest {
  requestId: string;
  cid: string;
  buffer?: string;
}

export interface IdentitySetResponse extends ProtocolRequest {
  requestId: string;
  success: boolean;
  error?: string;
}

export interface IdentityDocument {
  updatedAt?: number;
  schemas?: {
    [key: string]: JWE | SavedSchema;
  };
  [key: string]: unknown;
}

export interface IdentityResolved {
  cid: string | undefined;
  document: IdentityDocument | undefined;
}

export interface PeerDisconnectMessage {
  peerId: string;
  did: string;
  reason: string;
}

export interface PeerConnectMessage {
  peerId: string;
  did: string;
}