import type {
  CinderlinkClientInterface,
  LoggerInterface,
  PeerRole,
  PluginEventDef,
} from "@cinderlink/core-types";
import { peerIdFromString } from "@libp2p/peer-id";
import { CinderlinkClient } from "./client.js";
import { createHeliaNode, CinderlinkHeliaOptions } from "./ipfs/create.js";
import { DID } from "dids";

export interface CreateClientOptions {
  did: DID;
  address: `0x${string}`;
  addressVerification: string;
  nodes?: string[];
  options?: CinderlinkHeliaOptions;
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
  const ipfs = await createHeliaNode(nodes, options);
  const client = new CinderlinkClient<PluginEvents>({
      ipfs,
      did,
      address,
      addressVerification,
      logger,
      role,
    });

  nodes?.forEach((node) => {
    const peerIdString = node.split("/p2p/")[1];
    if (peerIdString) {
      const peerId = peerIdFromString(peerIdString);
      client.peers.addPeer(peerId, "server");
    }
  });

  return client as unknown as CinderlinkClientInterface<PluginEvents>;
}
