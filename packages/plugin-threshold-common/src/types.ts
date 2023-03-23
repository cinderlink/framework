import {
  TableRow,
  ProtocolRequest,
  PluginEventDef,
} from "@cinderlink/core-types";

export interface ThresholdPeerStatus {
  did: string;
  chunk: number;
  status: boolean;
  createdAt: number;
  validUntil: number;
  lastConfirmedAt: number;
}

export interface ThresholdOwnedData extends TableRow {
  cid: string;
  name: string;
  data: Uint8Array;
  threshold: number;
  peers: ThresholdPeerStatus[];
}

export interface ThresholdPeerData extends TableRow {
  cid: string;
  did: string;
  name: string;
  data: Uint8Array;
  createdAt: number;
  validUntil: number;
}

export interface ThresholdCapacityRequest extends ProtocolRequest {
  cid: string;
  size: number;
  expiration: number;
}

export interface ThresholdCapacityResponse extends ProtocolRequest {
  cid: string;
  confirm: boolean;
  expiration: number;
}

export interface ThresholdStoreRequest extends ProtocolRequest {
  cid: string;
  data: Uint8Array;
  expiration: number;
}

export interface ThresholdStoreResponse extends ProtocolRequest {
  cid: string;
  confirm: boolean;
  expiration: number;
}

export interface ThresholdRetrieveRequest extends ProtocolRequest {
  cid: string;
  expiration: number;
}

export interface ThresholdRetrieveResponse extends ProtocolRequest {
  cid: string;
  data?: Uint8Array;
  error?: string;
  expiration: number;
}

export interface ThresholdDeleteRequest extends ProtocolRequest {
  cid: string;
}

export interface ThresholdDeleteResponse extends ProtocolRequest {
  cid: string;
  confirm: boolean;
}

export interface PluginThresholdClientEvents extends PluginEventDef {
  send: {
    "/threshold/capacity/request": ThresholdCapacityRequest;
    "/threshold/capacity/response": ThresholdCapacityResponse;
    "/threshold/store/request": ThresholdStoreRequest;
    "/threshold/store/response": ThresholdStoreResponse;
    "/threshold/retrieve/request": ThresholdRetrieveRequest;
    "/threshold/retrieve/response": ThresholdRetrieveResponse;
    "/threshold/delete/request": ThresholdDeleteRequest;
    "/threshold/delete/response": ThresholdDeleteResponse;
  };
  receive: {
    "/threshold/capacity/request": ThresholdCapacityRequest;
    "/threshold/capacity/response": ThresholdCapacityResponse;
    "/threshold/store/request": ThresholdStoreRequest;
    "/threshold/store/response": ThresholdStoreResponse;
    "/threshold/retrieve/request": ThresholdRetrieveRequest;
    "/threshold/retrieve/response": ThresholdRetrieveResponse;
    "/threshold/delete/request": ThresholdDeleteRequest;
    "/threshold/delete/response": ThresholdDeleteResponse;
  };
  publish: {
    "/threshold/capacity/request": ThresholdCapacityRequest;
  };
  subscribe: {
    "/threshold/capacity/request": ThresholdCapacityRequest;
  };
}
