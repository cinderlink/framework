import type {
  CinderlinkClientInterface,
  PeerRole,
  PluginEventDef,
} from "@cinderlink/core-types";
import { peerIdFromString } from "@libp2p/peer-id";
import { Options } from "ipfs-core";
import { CinderlinkClient } from "./client";
import { createIPFS } from "./ipfs/create";
import { DID } from "dids";

export interface CreateClientOptions {
  did: DID;
  address: `0x${string}`;
  addressVerification: string;
  nodes?: string[];
  options?: Partial<Options>;
  role: PeerRole;
}

export async function createClient<
  PluginEvents extends PluginEventDef = PluginEventDef
>({
  did,
  address,
  addressVerification,
  nodes,
  options,
  role,
}: CreateClientOptions) {
  const ipfs = await createIPFS(nodes, options);
  const client: CinderlinkClientInterface<PluginEvents> =
    new CinderlinkClient<PluginEvents>({
      ipfs,
      did,
      address,
      addressVerification,
      role,
    });

  nodes?.forEach((node) => {
    const peerId = peerIdFromString(node.split("/p2p/")[1]);
    client.peers.addPeer(peerId, "server");
  });

  return client;
}
