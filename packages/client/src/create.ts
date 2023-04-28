import type {
  CinderlinkClientInterface,
  LoggerInterface,
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
  logger?: LoggerInterface;
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
  logger,
}: CreateClientOptions) {
  const ipfs = await createIPFS(nodes, options);
  const client: CinderlinkClientInterface<PluginEvents> =
    new CinderlinkClient<PluginEvents>({
      ipfs,
      did,
      address,
      addressVerification,
      logger,
      role,
    });

  nodes?.forEach((node) => {
    const peerId = peerIdFromString(node.split("/p2p/")[1]);
    client.peers.addPeer(peerId, "server");
  });

  return client;
}
