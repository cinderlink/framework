import type {
  CinderlinkClientInterface,
  LoggerInterface,
  PeerRole,
  PluginEventDef,
} from "@cinderlink/core-types";
import { peerIdFromString } from "@libp2p/peer-id";
import { HeliaInit } from "helia";
import { Libp2pOptions } from "libp2p"; // Import Libp2pOptions
import { CinderlinkClient } from "./client";
import { createHeliaNode } from "./ipfs/create";
import { DID } from "dids";

export interface CreateClientOptions {
  did: DID;
  address: `0x${string}`;
  addressVerification: string;
  nodes?: string[]; // These are peer multiaddrs, not direct Helia/Libp2p config objects
  libp2pOptions?: Partial<Libp2pOptions>;
  heliaOptions?: Partial<HeliaInit>;
  role: PeerRole;
  logger?: LoggerInterface;
}

export async function createClient<
  PluginEvents extends PluginEventDef = PluginEventDef
>({
  did,
  address,
  addressVerification,
  // nodes, // nodes are used later to add peers
  libp2pOptions = {},
  heliaOptions = {},
  role,
  logger,
}: CreateClientOptions) {
  const heliaNode = await createHeliaNode(libp2pOptions, heliaOptions);
  const client: CinderlinkClientInterface<PluginEvents> =
    new CinderlinkClient<PluginEvents>({
      ipfs: heliaNode.helia,
      libp2p: heliaNode.libp2p,
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
