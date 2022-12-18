import { keys } from "@libp2p/crypto";
import { createFromPrivKey } from "@libp2p/peer-id-factory";

export async function createPeerID(seed: Uint8Array) {
  const key = await keys.supportedKeys.ed25519.generateKeyPairFromSeed(seed);
  const peerId = await createFromPrivKey(key);
  return peerId;
}
