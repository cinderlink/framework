import type { CandorClientInterface, PluginEventDef } from "@candor/core-types";
import { peerIdFromString } from "@libp2p/peer-id";
import { Options } from "ipfs-core";
import { CandorClient } from "./client";
import { createIPFS } from "./ipfs/create";
import { DID } from "dids";

export interface CreateClientOptions {
  did: DID;
  address: string;
  addressVerification: string;
  nodes?: string[];
  options?: Partial<Options>;
}

export async function createClient<
  PluginEvents extends PluginEventDef = PluginEventDef
>({ did, address, addressVerification, nodes, options }: CreateClientOptions) {
  const ipfs = await createIPFS(nodes, options);
  const client: CandorClientInterface<PluginEvents> =
    new CandorClient<PluginEvents>({ ipfs, did, address, addressVerification });

  nodes?.forEach((node) => {
    const peerId = peerIdFromString(node.split("/p2p/")[1]);
    client.peers.addPeer(peerId, "server");
  });

  return client;
}
