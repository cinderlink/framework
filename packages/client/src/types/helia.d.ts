declare module '@helia/interface' {
  import { Libp2p } from 'libp2p';
  import { Blockstore } from 'interface-blockstore';
  import { Datastore } from 'interface-datastore';
  import { CID } from 'multiformats/cid';
  import { PeerId } from '@libp2p/peer-id';
  import { Multiaddr } from '@multiformats/multiaddr';

  export interface Helia {
    libp2p: Libp2p;
    blockstore: Blockstore;
    datastore: Datastore;
    start(): Promise<void>;
    stop(): Promise<void>;
    isStarted(): boolean;
    getEndpointConfig(): Promise<{ id: PeerId; addresses: Multiaddr[] }>;
  }
}

declare module '@helia/remote-pinning' {
  import { Helia } from '@helia/interface';
  
  export interface RemotePins {
    add(cid: string | CID, options?: { name?: string; origins?: string[] }): Promise<void>;
    rm(cid: string | CID): Promise<void>;
    ls(options?: { cid?: string | CID; name?: string; status?: string[] }): AsyncIterable<{
      cid: CID;
      name?: string;
      status: string;
      created: Date;
      pinned: boolean;
    }>;
  }

  export function createRemotePins(helia: Helia): RemotePins;
}
