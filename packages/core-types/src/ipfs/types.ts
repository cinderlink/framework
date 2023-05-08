import type { IPFS } from "ipfs-core-types";
import { Libp2p } from "libp2p";

export type IPFSWithLibP2P = IPFS & {
  libp2p: Libp2p & {
    addEventListener: (
      event: string,
      callback: (event: CustomEvent<any>) => Promise<void> | void
    ) => void;
  };
};
