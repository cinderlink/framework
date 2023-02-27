import { ProtocolRequest } from "./../protocol/types";
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
}

export interface IdentitySetResponse extends ProtocolRequest {
  requestId: string;
  success: boolean;
  error?: string;
}
