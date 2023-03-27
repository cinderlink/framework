import { keys } from "@libp2p/crypto";
import { createFromPrivKey } from "@libp2p/peer-id-factory";
import { PeerId } from "@libp2p/interface-peer-id";

export async function createPeerId(seed: Uint8Array): Promise<PeerId> {
  const key = await keys.supportedKeys.ed25519.generateKeyPairFromSeed(seed);
  const peerId = await createFromPrivKey(key);
  return peerId;
}
