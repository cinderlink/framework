export type IdentityResolveRequest = {
  requestID: string;
  since: number;
};

export type IdentityResolveResponse = {
  requestID: string;
  cid?: string;
  doc?: Record<string, unknown>;
  error?: string;
};

export type IdentitySetRequest = {
  requestID: string;
  cid: string;
};

export type IdentitySetResponse = {
  requestID: string;
  success: boolean;
  error?: string;
};
