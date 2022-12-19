import type { Options } from "ipfs-core";
import { createCryptidsClient, PluginConstructor } from "@cryptids/client";
import { CryptidsServer } from "./server";

export async function createCryptidsServer(
  seed: Uint8Array,
  plugins: [PluginConstructor, Record<string, unknown>][] = [],
  nodes: string[] = [],
  options: Partial<Options> = {}
) {
  const client = await createCryptidsClient(seed, nodes, options);
  plugins.forEach(([Plugin, options]) => {
    client.addPlugin(new Plugin(client, options));
  });
  return new CryptidsServer(client);
}
