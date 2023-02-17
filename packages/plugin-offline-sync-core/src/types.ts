import type {
  EncodedP2PMessage,
  PluginEventDef,
  TableRow,
} from "@candor/core-types";

export type OfflineSyncSendRequest<
  Data extends EncodedP2PMessage = EncodedP2PMessage
> = {
  requestId: string;
  recipient: string;
  message: Data;
};

export type OfflineSyncRecord<
  Data extends EncodedP2PMessage = EncodedP2PMessage
> = OfflineSyncSendRequest<Data> &
  TableRow & {
    sender: string;
    attempts: number;
    createdAt: number;
    attemptedAt?: number;
    deliveredAt?: number;
  };

export type OfflineSyncSendResponse = {
  requestId: string;
  saved: boolean;
  error?: string;
};

export type OfflineSyncGetRequest = {
  requestId: string;
  limit: number;
};

export type OfflineSyncGetResponse = {
  requestId: string;
  messages: OfflineSyncRecord[];
};

export type OfflineSyncGetConfirmation = {
  requestId: string;
  saved: number[];
  errors?: Record<number, string>;
};

export type OfflineSyncDeleteRequest = {
  requestId: string;
};

export type OfflineSyncDeleteConfirmation = {
  requestId: string;
};

export interface OfflineSyncEvents extends PluginEventDef {
  "/offline/send/request": OfflineSyncSendRequest;
  "/offline/send/response": OfflineSyncSendResponse;
  "/offline/get/request": OfflineSyncGetRequest;
  "/offline/get/response": OfflineSyncGetResponse;
  "/offline/get/confirmation": OfflineSyncGetConfirmation;
  "/offline/delete/request": OfflineSyncDeleteRequest;
  "/offline/delete/confirmation": OfflineSyncDeleteConfirmation;
}

export type OfflineSyncClientEvents = {
  send: {
    "/offline/send/request": OfflineSyncSendRequest;
    "/offline/get/request": OfflineSyncGetRequest;
    "/offline/get/confirmation": OfflineSyncGetConfirmation;
  };
  receive: {
    "/offline/send/response": OfflineSyncSendResponse;
    "/offline/get/response": OfflineSyncGetResponse;
  };
  publish: {};
  subscribe: {};
  emit: {
    ready: void;
  } & {
    [key in `/send/response/${string}`]: OfflineSyncSendResponse;
  };
};