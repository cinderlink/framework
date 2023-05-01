import * as json from 'multiformats/codecs/json';

export interface ProtocolMessage<
  TProtocol extends string = string,
  TTopic extends string = string,
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> {
  payload: TPayload;
  protocol: TProtocol;
  topic: TTopic;
}

export function encodeMessage(message: ProtocolMessage) {
  if (!message.protocol) {
    throw new Error(`websocket/client: message missing protocol`);
  }
  if (!message.topic) {
    throw new Error(`websocket/client: message missing topic`);
  }
  return json.encode(message);
}

export function decodeMessage(message: Uint8Array) {
  const { protocol, topic, payload } = json.decode(message) as ProtocolMessage;
  if (!protocol) {
    throw new Error(`websocket/client: message missing protocol`);
  }
  if (!topic) {
    throw new Error(`websocket/client: message missing topic`);
  }
  return { protocol, topic, payload };
}
