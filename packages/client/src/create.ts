import type { CandorClientInterface, PluginEventDef } from "@candor/core-types";
import { Options } from "ipfs-core";
import { CandorClient } from "./client";
import { createDID } from "./did/create";
import { createIPFS } from "./ipfs/create";

export async function createClient<
  PluginEvents extends PluginEventDef = PluginEventDef
>(seed: Uint8Array, nodes: string[] = [], options: Partial<Options> = {}) {
  const ipfs = await createIPFS(nodes, options);
  const did = await createDID(seed);
  const client: CandorClientInterface<PluginEvents> =
    new CandorClient<PluginEvents>({ ipfs, did });
  return client;
}
