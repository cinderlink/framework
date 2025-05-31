import { createHelia } from "helia";
import type { Helia, HeliaInit } from "helia";
import { webSockets } from "@libp2p/websockets";
import { all } from "@libp2p/websockets/filters";
import { noise } from "@chainsafe/libp2p-noise";
import { mplex } from "@libp2p/mplex";
import { createLibp2p, Libp2pOptions, Libp2p } from "libp2p";

// Define a new return type
export interface HeliaNode {
  helia: Helia;
  libp2p: Libp2p;
}

export async function createHeliaNode(
  // nodes: string[] = [], // nodes parameter seems unused, removing for now.
  libp2pOpts: Partial<Libp2pOptions> = {},
  heliaOpts: Partial<HeliaInit> = {}
): Promise<HeliaNode> {
  const libp2p = await createLibp2p({
    transports: [webSockets({ filter: all })],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    ...libp2pOpts,
  });

  const helia = await createHelia({
    libp2p,
    ...heliaOpts,
  });

  return { helia, libp2p };
}
