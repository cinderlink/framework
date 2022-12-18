import type { Options } from "ipfs-core";
import { createCryptidsClient, PluginConstructor } from "@cryptids/client";
import { CryptidsServer } from "./server";

export async function createCryptidsServer(
  seed: Uint8Array,
  plugins: [PluginConstructor, Record<string, unknown>][] = [],
  options: Partial<Options> = {}
) {
  const client = await createCryptidsClient(seed, [], options, plugins);
  return new CryptidsServer(client);
}
