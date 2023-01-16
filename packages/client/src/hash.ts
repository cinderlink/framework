import * as json from "multiformats/codecs/json";
import { base58btc } from "multiformats/bases/base58";
import { sha256 } from "multiformats/hashes/sha2";

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
