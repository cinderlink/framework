import { createHelia } from "helia";
import type { HeliaInit } from "helia";
import { IPFSWithLibP2P } from "@cinderlink/core-types";

/**
 * Creates a Helia node with standardized libp2p configuration
 * @param _nodes - Bootstrap nodes (not used in current implementation)
 * @param overrides - Configuration overrides
 */
export async function createHeliaNode(
  _nodes: string[] = [],
  overrides: Partial<HeliaInit> = {}
): Promise<IPFSWithLibP2P> {
  // Let Helia use its default libp2p configuration for now
  // We can customize later once the basic setup is working
  const helia = await createHelia({
    ...overrides,
  });

  return helia as IPFSWithLibP2P;
}
