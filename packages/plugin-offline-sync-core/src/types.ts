import type {
  ProtocolRequest,
  PluginEventDef,
  TableRow,
  OutgoingP2PMessage,
} from "@cinderlink/core-types";

export type OfflineSyncSendRequest<
  Events extends PluginEventDef = PluginEventDef,
  Topic extends keyof Events["send"] = keyof Events["send"]
> = {
  requestId: string;
  recipient: string;
  message: OutgoingP2PMessage<Events, Topic>;
};

export type OfflineSyncRecord<
  Events extends PluginEventDef = PluginEventDef,
  Topic extends keyof Events["send"] = keyof Events["send"]
> = OfflineSyncSendRequest<Events, Topic> &
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
