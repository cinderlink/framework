import { ProtocolRequest } from "./../protocol/types";
export interface IdentityResolveRequest extends ProtocolRequest {
  requestID: string;
  since: number;
}

export interface IdentityResolveResponse extends ProtocolRequest {
  requestID: string;
  cid?: string;
  doc?: Record<string, unknown>;
  error?: string;
}

export interface IdentitySetRequest extends ProtocolRequest {
  requestID: string;
  cid: string;
}

export interface IdentitySetResponse extends ProtocolRequest {
  requestID: string;
  success: boolean;
  error?: string;
}
