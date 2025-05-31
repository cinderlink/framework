import type { Helia } from "helia";

export interface EventListener {
  addEventListener: (
    event: string,
    callback: (event: CustomEvent<any>) => Promise<void> | void
  ) => void;
}

export type IPFSWithLibP2P = Helia;
