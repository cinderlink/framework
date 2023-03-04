import { ethers } from "ethers";
import * as json from "multiformats/codecs/json";
import { base58btc } from "multiformats/bases/base58";
import { sha256 } from "multiformats/hashes/sha2";
import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import resolver from "./resolver";

export async function createDID(seed: Uint8Array) {
  const provider = new Ed25519Provider(seed);
  const did = new DID({ provider, resolver: resolver as any }) as DID;
  await did.authenticate();
  return did;
}

export async function createSignerDID(
  app: string,
  signer: ethers.Signer,
  nonce: number = 0
) {
  const address = await signer.getAddress();
  const entropy = createAccountEntropyMessage(app, address, nonce);
  const signature = await signer.signMessage(entropy);
  const seed = await createSeed(signature);
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

export async function createSeed(seed: string) {
  const seedBytes = await sha256.encode(json.encode(seed));
  return seedBytes;
}

export async function createHash(entropy: string) {
  const hashed = await base58btc.encode(
    await sha256.encode(json.encode(entropy))
  );
  return hashed;
}
