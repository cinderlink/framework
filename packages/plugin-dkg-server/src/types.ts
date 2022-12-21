import type { IdentityResolveResponse } from "@cryptids/client";

export type KeyFetchRequest = {
  requestID: string;
  keyId: string;
};

export type KeyFetchResponse = {
  requestID: string;
  keyId: string;
  fragment: string;
};

export type KeyStoreRequest = {
  requestID: string;
  keyId: string;
  threshold: number;
  shares: number;
};

export type IdentityServerEvents = {
  publish: {};
  subscribe: {};
  send: {
    "/dkg/key/fetch": KeyFetchRequest;
  };
  receive: {};
  emit: {};
};
