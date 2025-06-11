import type { Helia } from '@helia/interface';
import type { Libp2p } from 'libp2p';
import type { RemotePins } from '@helia/remote-pinning';
/**
 * Extended Helia interface with additional properties used by Cinderlink
 */
export interface CinderlinkHelia extends Helia {
    /** libp2p instance used by Helia */
    libp2p: Libp2p;
    /** Remote pinning service interface */
    remotePins?: RemotePins;
}
/**
 * @deprecated Use CinderlinkHelia instead
 */
export type IPFSWithLibP2P = CinderlinkHelia;
export interface EventListener {
    addEventListener: (event: string, callback: (event: CustomEvent<any>) => Promise<void> | void) => void;
}
//# sourceMappingURL=types.d.ts.map