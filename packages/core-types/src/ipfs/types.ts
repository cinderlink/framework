import type { RemotePins } from '@helia/remote-pinning';

export interface EventListener {
  addEventListener: (
    event: string,
    callback: (event: CustomEvent<any>) => Promise<void> | void
  ) => void;
}

// We'll define our own interface rather than extending Helia directly
// This avoids import issues while maintaining type compatibility
export interface IPFSWithLibP2P {
  libp2p: any;
  remotePins?: RemotePins;
  // Include essential Helia methods we need
  blockstore: any;
  datastore: any;
  pins: any;
  start(): Promise<void>;
  stop(): Promise<void>;
  gc(options?: any): Promise<void>;
}
