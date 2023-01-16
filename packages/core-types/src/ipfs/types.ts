import type { IPFS } from "ipfs-core-types";
import type { Libp2p } from "libp2p";

export type IPFSWithLibP2P = IPFS & {
  libp2p: Libp2p;
};
