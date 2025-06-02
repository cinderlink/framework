import { createHelia } from "helia";
import type { HeliaInit } from "helia";
import { IPFSWithLibP2P } from "@cinderlink/core-types";
import { createRemotePins } from "@helia/remote-pinning";

/**
 * Creates a Helia node with standardized libp2p configuration
 * and distributed pinning capabilities
 */
export async function createHeliaNode(
  _nodes: string[] = [],
  overrides: Partial<HeliaInit> = {}
): Promise<IPFSWithLibP2P> {
  // Create base Helia node
  const helia = await createHelia({
    ...overrides,
  });

  // Add remote pinning support
  // This enables remote pinning service integration
  const remotePinner = createRemotePins(helia, {
    // Remote pinning services can be configured here
    // Example configuration for Pinata or other services:
    // services: [{
    //   name: 'pinata',
    //   endpoint: new URL('https://api.pinata.cloud/psa'),
    //   accessToken: process.env.PINATA_API_KEY
    // }]
  });

  // Extend the helia instance with remote pinning capabilities
  const heliaWithRemotePinning = Object.assign(helia, {
    remotePins: remotePinner,
  });

  return heliaWithRemotePinning as IPFSWithLibP2P;
}
