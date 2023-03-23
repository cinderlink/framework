import { ThresholdCapacityRequest } from "@cinderlink/plugin-threshold-common";
import {
  TableRow,
  TableDefinition,
  PluginInterface,
  PluginEventDef,
  ProtocolRequest,
  IncomingP2PMessage,
  IncomingPubsubMessage,
  EncodingOptions,
  CinderlinkClientInterface,
} from "@cinderlink/core-types";
import { SchemaDef } from "@cinderlink/core-types";
import Keystore from "./keys";

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

export class PluginThresholdClient
  implements PluginInterface<PluginThresholdClientEvents>
{
  id = "thresholdClient";
  keys: Keystore;

  p2p = {
    "/threshold/capacity/request": this.onCapacityRequest,
    "/threshold/capacity/response": this.onCapacityResponse,
    "/threshold/store/request": this.onStoreRequest,
    "/threshold/store/response": this.onStoreResponse,
    "/threshold/retrieve/request": this.onRetrieveRequest,
    "/threshold/retrieve/response": this.onRetrieveResponse,
    "/threshold/delete/request": this.onDeleteRequest,
    "/threshold/delete/response": this.onDeleteResponse,
  };

  pubsub = {
    "/threshold/capacity/request": this.onCapacityRequestPublish,
  };

  constructor(public client: CinderlinkClientInterface) {
    this.keys = new Keystore();
  }

  sendToPeers(
    data: Uint8Array,
    options: {
      minPeers?: number;
      maxPeers?: number;
      redundancy?: number;
      timeout?: number;
    }
  ) {}

  async onCapacityRequestPublish(
    message: IncomingPubsubMessage<
      PluginThresholdClientEvents,
      "/threshold/capacity/request",
      EncodingOptions
    >
  ) {}

  async onCapacityRequest(
    message: IncomingP2PMessage<
      PluginThresholdClientEvents,
      "/threshold/capacity/request",
      EncodingOptions
    >
  ) {}
  async onCapacityResponse(
    message: IncomingP2PMessage<
      PluginThresholdClientEvents,
      "/threshold/capacity/response",
      EncodingOptions
    >
  ) {}
  async onStoreRequest(
    message: IncomingP2PMessage<
      PluginThresholdClientEvents,
      "/threshold/store/request",
      EncodingOptions
    >
  ) {}
  async onStoreResponse(
    message: IncomingP2PMessage<
      PluginThresholdClientEvents,
      "/threshold/store/response",
      EncodingOptions
    >
  ) {}
  async onRetrieveRequest(
    message: IncomingP2PMessage<
      PluginThresholdClientEvents,
      "/threshold/retrieve/request",
      EncodingOptions
    >
  ) {}
  async onRetrieveResponse(
    message: IncomingP2PMessage<
      PluginThresholdClientEvents,
      "/threshold/retrieve/response",
      EncodingOptions
    >
  ) {}
  async onDeleteRequest(
    message: IncomingP2PMessage<
      PluginThresholdClientEvents,
      "/threshold/delete/request",
      EncodingOptions
    >
  ) {}
  async onDeleteResponse(
    message: IncomingP2PMessage<
      PluginThresholdClientEvents,
      "/threshold/delete/response",
      EncodingOptions
    >
  ) {}

  static split(data: number[], chunks: number): number[][] {
    const chunkSize = Math.ceil(data.length / chunks);
    const chunksArray = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunksArray.push(data.slice(i, i + chunkSize));
    }
    return chunksArray;
  }

  static merge(data: number[][]): number[] {
    return data.flat();
  }
}

export default PluginThresholdClient;
