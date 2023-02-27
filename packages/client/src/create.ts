import { ethers } from "ethers";
import type { CandorClientInterface, PluginEventDef } from "@candor/core-types";
import { peerIdFromString } from "@libp2p/peer-id";
import { Options } from "ipfs-core";
import { CandorClient } from "./client";
import { createDID } from "./did/create";
import { createIPFS } from "./ipfs/create";
import { createSeed } from "./hash";
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

export async function createSignerDID(
  app: string,
  signer: ethers.Signer,
  nonce: number = 0
) {
  const address = await signer.getAddress();
  const entropy = createAccountEntropyMessage(app, address, nonce);
  const seed = await createSeed(entropy);
  const did = await createDID(seed);
  return did;
}

export function createAccountEntropyMessage(
  app: string,
  address: string,
  nonce: number
) {
  return `creating account for ${app} with address ${address}, nonce ${nonce}`;
}

export function createAddressVerificationMessage(
  app: string,
  did: string,
  address: string
) {
  return `address verification for ${app} with DID ${did}, owned by address ${address}`;
}

export async function signAddressVerification(
  app: string,
  did: string,
  signer: ethers.Signer
) {
  const address = await signer.getAddress();
  const message = createAddressVerificationMessage(app, did, address);
  return signer.signMessage(message);
}

export async function checkAddressVerification(
  app: string,
  did: string,
  address: string,
  signature: string
) {
  const message = createAddressVerificationMessage(app, did, address);
  const signer = ethers.utils.verifyMessage(message, signature);
  return signer === address;
}
