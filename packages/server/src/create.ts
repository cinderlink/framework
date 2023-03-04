import type { Options } from "ipfs-core";
import type { PluginConstructor } from "@candor/core-types";
import type { DID } from "dids";
import { createClient } from "@candor/client";
import { CandorServer } from "./server";

export interface CreateServerOptions {
  did: DID;
  address: string;
  addressVerification: string;
  plugins?: [PluginConstructor<any>, Record<string, unknown>][];
  nodes?: string[];
  options?: Partial<Options>;
}

export async function createServer({
  did,
  address,
  addressVerification,
  plugins = [],
  nodes = [],
  options = {},
}: CreateServerOptions) {
  const client = await createClient({
    did,
    address,
    addressVerification,
    nodes,
    options,
  });
  plugins.forEach(([Plugin, pluginOptions]) => {
    console.info("adding plugin", Plugin);
    client.addPlugin(new Plugin(client, pluginOptions));
  });
  return new CandorServer(client);
}
