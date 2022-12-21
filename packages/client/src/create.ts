import { Options } from "ipfs-core";
import * as json from "multiformats/codecs/json";
import { sha256 } from "multiformats/hashes/sha2";
import { PluginEventDef } from "./plugin/types";
import { CryptidsClient } from "./client";
import { createDID } from "./did/create";
import { createIPFS } from "./ipfs/create";
import { createPeerID } from "./ipfs/peer-id";

export async function createCryptidsClient<
  PluginEvents extends PluginEventDef = PluginEventDef
>(seed: Uint8Array, nodes: string[] = [], options: Partial<Options> = {}) {
  const peerId = await createPeerID(seed);
  const ipfs = await createIPFS(peerId, nodes, options);
  const did = await createDID(seed);
  const client = new CryptidsClient<PluginEvents>({ ipfs, did });
  return client;
}

export async function createCryptidsSeed(seed: string) {
  const seedBytes = await sha256.encode(json.encode(`cryptids:${seed}`));
  return seedBytes;
}
