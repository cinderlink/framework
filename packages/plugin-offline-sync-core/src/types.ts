import type {
  ProtocolRequest,
  PluginEventDef,
  TableRow,
  OutgoingP2PMessage,
  EncodingOptions,
} from "@candor/core-types";

export type OfflineSyncSendRequest<
  Events extends PluginEventDef = PluginEventDef,
  Topic extends keyof Events["send"] = keyof Events["send"],
  Encoding extends EncodingOptions = EncodingOptions
> = {
  requestId: string;
  recipient: string;
  message: OutgoingP2PMessage<Events, Topic, Encoding>;
};

export type OfflineSyncRecord<
  Events extends PluginEventDef = PluginEventDef,
  Topic extends keyof Events["send"] = keyof Events["send"],
  Encoding extends EncodingOptions = EncodingOptions
> = OfflineSyncSendRequest<Events, Topic, Encoding> &
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

export interface OfflineSyncClientEvents extends PluginEventDef {
  send: {
    "/offline/send/request": OfflineSyncSendRequest;
    "/offline/get/request": OfflineSyncGetRequest;
    "/offline/get/response": OfflineSyncGetResponse;
    "/offline/get/confirmation": OfflineSyncGetConfirmation;
  };
  receive: {
    "/offline/send/response": OfflineSyncSendResponse;
    "/offline/get/request": OfflineSyncGetRequest;
    "/offline/get/response": OfflineSyncGetResponse;
    "/offline/get/confirmation": OfflineSyncGetConfirmation;
  };
  publish: {};
  subscribe: {};
  pluginEvents: {};
  coreEvents: {};
  emit: {
    ready: ProtocolRequest;
  } & {
    [key in `/send/response/${string}`]: OfflineSyncSendResponse;
  };
}
