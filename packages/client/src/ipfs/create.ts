import { create } from "ipfs-core";
import type { Options } from "ipfs-core";
import type { PeerId } from "@libp2p/interface-peer-id";
import { webSockets } from "@libp2p/websockets";
import { all } from "@libp2p/websockets/filters";
import { noise } from "@chainsafe/libp2p-noise";

import { IPFSWithLibP2P } from "./types";

export async function createIPFS(
  peerId: PeerId,
  nodes: string[] = [],
  overrides: Partial<Options> = {}
): Promise<IPFSWithLibP2P> {
  const options: Options = {
    init: {
      allowNew: true,
      emptyRepo: true,
      // algorithm: "Ed25519",
      // privateKey: peerId,
    },

    start: false,
    repo: "cryptids",
    repoAutoMigrate: false,

    libp2p: {
      // peerId,
      connectionManager: {
        autoDial: false,
      },
      connectionEncryption: [noise()],
      transports: [
        webSockets({
          filter: all,
        }),
      ],
    },

    relay: {
      enabled: true,
      hop: {
        enabled: true,
      },
    },

    config: {
      Bootstrap: nodes,
      Addresses: {
        Swarm: [],
      },
    },
    ...overrides,
  };
  const ipfs = await create(options);

  console.info(await ipfs.version());

  return ipfs as unknown as IPFSWithLibP2P;
}
