import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";
import resolver from "./resolver";

export async function createDID(seed: Uint8Array) {
  const provider = new Ed25519Provider(seed);
  const did = new DID({ provider, resolver: resolver as any }) as DID;
  await did.authenticate();
  return did;
}
