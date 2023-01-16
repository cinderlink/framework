import type { Options } from "ipfs-core";
import type { PluginConstructor } from "@candor/core-types";
import { createClient } from "@candor/client";
import { CandorServer } from "./server";

export async function createServer(
  seed: Uint8Array,
  plugins: [PluginConstructor, Record<string, unknown>][] = [],
  nodes: string[] = [],
  options: Partial<Options> = {}
) {
  const client = await createClient(seed, nodes, options);
  plugins.forEach(([Plugin, options]) => {
    client.addPlugin(new Plugin(client, options));
  });
  return new CandorServer(client);
}
