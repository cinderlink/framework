import { JWE } from "did-jwt";
import { DagJWS, VerifyJWSResult } from "dids";
import { ByteView } from "multiformats/codecs/json";
import { Peer } from "./../p2p";
import { PluginEventDef } from "./../plugin/types";

export interface ProtocolRequest extends Record<string, unknown> {
  requestId?: string;
  [key: string]: unknown;
}

export interface EncodingOptions {
  sign: boolean;
  encrypt: boolean;
  recipients?: string[];
}

export interface HandshakedPeer extends Peer, ProtocolRequest {
  handshake: true;
  did: string;
}

export interface HandshakeRequest extends ProtocolRequest {
  did: string;
  protocols?: string[];
}

export interface HandshakeChallenge extends ProtocolRequest {
  challenge: string;
}

export interface HandshakeComplete extends ProtocolRequest {
  challenge: string;
}

export interface HandshakeSuccess extends ProtocolRequest {}

export interface HandshakeError extends ProtocolRequest {
  error: string;
}

export type ProtocolJWSResult<Payload = ProtocolRequest> = VerifyJWSResult & {
  payload: Payload;
};

export type SignedProtocolPayload<
  Payload = ProtocolRequest,
  Verified extends boolean = false
> = Verified extends true ? ProtocolJWSResult<Payload> : DagJWS;

export type EncryptedProtocolPayload<
  Payload = ProtocolRequest,
  Decrypted extends boolean = false
> = Decrypted extends true ? ByteView<Payload> : JWE;

export type ProtocolPayload<
  Payload = ProtocolRequest,
  Encoding extends EncodingOptions = EncodingOptions
> = Encoding["encrypt"] extends true
  ? EncryptedProtocolPayload<
      Payload,
      Encoding["encrypt"] extends true ? false : true
    >
  : Encoding["sign"] extends true
  ? SignedProtocolPayload<Payload, Encoding["sign"] extends true ? false : true>
  : Payload;

export type DecodedProtocolPayload<
  Request = ProtocolRequest,
  Encoding extends EncodingOptions = EncodingOptions
> = {
  payload: Request;
  signed?: Encoding["sign"];
  encrypted?: Encoding["encrypt"];
  recipients?: Encoding["recipients"];
  sender?: string;
};

export type EncodedProtocolPayload<
  Payload = ProtocolPayload,
  Encoding extends EncodingOptions = EncodingOptions
> = {
  signed?: Encoding["sign"];
  encrypted?: Encoding["encrypt"];
  recipients?: Encoding["recipients"];
  payload: ProtocolPayload<Payload, Encoding>;
};

export type ProtocolMessage<
  Payload = ProtocolRequest,
  Topic = string,
  Encoding extends EncodingOptions = EncodingOptions
> = EncodedProtocolPayload<Payload, Encoding> & {
  topic: Topic;
  cid?: string;
  peer?: Peer;
};

export interface ProtocolKeepAlive {
  timestamp: number;
}

export type DecodedProtocolMessage<
  Events extends PluginEventDef = PluginEventDef,
  Type extends keyof Events = keyof Events,
  Topic extends keyof Events[Type] = keyof Events[Type],
  Encoding extends EncodingOptions = EncodingOptions
> = {
  topic: Topic;
  payload: Events[Type][Topic];
  peer: Peer;
  signed?: Encoding["sign"];
  encrypted?: Encoding["encrypt"];
  recipients?: Encoding["recipients"];
};

export interface ProtocolEvents<
  PluginEvents extends PluginEventDef = PluginEventDef
> extends PluginEventDef {
  send: {
    "/cinderlink/keepalive": ProtocolKeepAlive;
  };
  receive: {
    "/cinderlink/keepalive": ProtocolKeepAlive;
  };
  publish: {
    "/cinderlink/peer/connect": Peer;
    "/cinderlink/peer/disconnect": Peer;
  };
  emit: {
    "/cinderlink/handshake/success": Peer;
  } & {
    [key in `/cinderlink/request/${string}`]:
      | DecodedProtocolMessage<PluginEvents>
      | DecodedProtocolMessage<PluginEvents>;
  };
}
