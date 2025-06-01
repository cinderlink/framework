import { keys } from "@libp2p/crypto";
import { peerIdFromPrivateKey } from "@libp2p/peer-id";
import type { PeerId } from "@libp2p/interface";

export async function createPeerId(seed: Uint8Array): Promise<PeerId> {
  const key = await keys.generateKeyPairFromSeed("Ed25519", seed);
  const peerId = peerIdFromPrivateKey(key);
  return peerId;
}
