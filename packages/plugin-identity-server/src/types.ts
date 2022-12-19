import type { IdentityResolveResponse } from "@cryptids/client";

export type IdentityResolveRequest = {
  requestID: string;
  since: number;
};

export type IdentitySetRequest = {
  requestID: string;
  cid: string;
};

export type IdentitySetResponse = {
  requestID: string;
  cid: string;
};

export type IdentityServerEvents = {
  publish: {};
  subscribe: {};
  send: {
    "/identity/resolve/response": IdentityResolveResponse;
    "/identity/set/response": IdentitySetRequest;
  };
  receive: {
    "/identity/set/request": IdentitySetRequest;
    "/identity/resolve/request": IdentityResolveRequest;
  };
  emit: {};
};
