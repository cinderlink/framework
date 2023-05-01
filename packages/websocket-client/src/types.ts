import type { DID } from 'dids';
import type { WebSocket } from 'ws';
import type { Client, WalletClient } from 'viem';
import type { Account, HDAccount, PrivateKeyAccount } from 'viem/accounts';
import { ProtocolMessage } from './messages';

export interface Peer {
  address?: string;
  challenge?: string;
  challengedAt?: number;
  connected: boolean;
  connectedAt?: number;
  did?: string;
  io?: {
    in?: WebSocket;
    out?: WebSocket;
  };
  listenerId: string;
  pongAt?: number;
  protocols: string[];
  seenAt?: number;
  signature?: string;
  signedAt?: number;
  uris: string[];
}

export interface CinderlinkCredentials {
  password: string;
  username: string;
}

export interface IncomingProtocolMessage<
  TProtocol extends string = string,
  TTopic extends string = string,
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> extends ProtocolMessage {
  payload: TPayload;
  peer: Peer;
  protocol: TProtocol;
  topic: TTopic;
}

export type ProtocolEvents<
  TProtocol extends string = string,
  TEvents extends Record<string, Record<string, unknown>> = Record<
    string,
    Record<string, unknown>
  >,
  TIncoming extends boolean = false,
> = {
  [K in keyof TEvents]: TIncoming extends true
    ? IncomingProtocolMessage<
        TProtocol,
        K extends string ? K : string,
        TEvents[K]
      >
    : ProtocolMessage<TProtocol, K extends string ? K : string, TEvents[K]>;
};

export interface CinderlinkIdentity<
  Type extends 'wallet' | 'hd' | 'pkey',
  WithClient extends boolean = false,
> {
  account?: Type extends 'wallet'
    ? Account
    : Type extends 'pkey'
    ? PrivateKeyAccount
    : HDAccount;
  address: string;
  client?: Type extends 'wallet'
    ? WalletClient
    : WithClient extends true
    ? Client
    : undefined;
  did: DID;
  id: string;
  listenerId: string;
  type?: Type;
}
