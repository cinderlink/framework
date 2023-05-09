import type { IPFS } from "ipfs-core-types";

export interface EventListener {
  addEventListener: (
    event: string,
    callback: (event: CustomEvent<any>) => Promise<void> | void
  ) => void;
}

export type IPFSWithLibP2P = IPFS & {
  libp2p: any;
};
