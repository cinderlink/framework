import { createHelia } from "helia";
import type { HeliaInit } from "helia";
import { webSockets } from "@libp2p/websockets";
import { all } from "@libp2p/websockets/filters";
import { noise } from "@chainsafe/libp2p-noise";
import { mplex } from "@libp2p/mplex";
import { IPFSWithLibP2P } from "@cinderlink/core-types";
import { createLibp2p } from "libp2p";

export async function createHeliaNode(
  nodes: string[] = [],
  overrides: Partial<HeliaInit> = {}
): Promise<IPFSWithLibP2P> {
  const libp2p = await createLibp2p({
    transports: [webSockets({ filter: all })],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    ...overrides as any,
  });

  const helia = await createHelia({ libp2p });

  return helia as unknown as IPFSWithLibP2P;
}
