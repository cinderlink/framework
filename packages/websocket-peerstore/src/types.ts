export interface Peer {
  did: string;
  protocols: string[];
  challenge?: string;
  challengedAt?: number;
  signature?: string;
  signedAt?: number;
  seenAt?: number;
  connected: boolean;
  connectedAt?: number;
}
