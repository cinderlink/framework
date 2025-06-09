import type { Helia } from '@helia/interface';
import type { Libp2p } from 'libp2p';
import type { RemotePin } from '@helia/remote-pinning';
import type { Pins } from '@helia/pins';

/**
 * Extended Helia interface with additional properties used by Cinderlink
 */
export interface CinderlinkHelia extends Helia {
  /** libp2p instance used by Helia */
  libp2p: Libp2p;
  
  /** Remote pinning service interface */
  remotePins?: RemotePin;

  /** Pins service interface */
  pins: Pins;
}

/**
 * @deprecated Use CinderlinkHelia instead
 */
export type IPFSWithLibP2P = CinderlinkHelia;

export interface EventListener {
  addEventListener: (
    event: string,
    callback: (event: CustomEvent<any>) => Promise<void> | void
  ) => void;
}
