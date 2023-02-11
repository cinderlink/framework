import type {
  IdentityResolveResponse,
  IdentityResolveRequest,
  IdentitySetRequest,
  IdentitySetResponse,
} from "@candor/core-types";

export type IdentityServerEvents = {
  publish: {};
  subscribe: {};
  send: {
    "/identity/resolve/response": IdentityResolveResponse;
    "/identity/set/response": IdentitySetResponse;
  };
  receive: {
    "/identity/set/request": IdentitySetRequest;
    "/identity/resolve/request": IdentityResolveRequest;
  };
  emit: {};
};
