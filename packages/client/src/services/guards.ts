/**
 * Service availability guards for libp2p services
 * Provides type-safe access to optional libp2p services
 */

import type { CinderlinkClientInterface } from "@cinderlink/core-types";

import { ServiceNotAvailableError } from "../errors/index.js";

/**
 * Get DHT service with availability check
 */
export function getDHTService(client: CinderlinkClientInterface): any {
  const dht = client.ipfs.libp2p.services.dht;
  if (!dht) {
    throw new ServiceNotAvailableError('DHT');
  }
  return dht;
}

/**
 * Get PubSub service with availability check
 */
export function getPubSubService(client: CinderlinkClientInterface): any {
  const pubsub = client.ipfs.libp2p.services.pubsub;
  if (!pubsub) {
    throw new ServiceNotAvailableError('PubSub');
  }
  return pubsub;
}

/**
 * Get Identify service with availability check
 */
export function getIdentifyService(client: CinderlinkClientInterface): any {
  const identify = client.ipfs.libp2p.services.identify;
  if (!identify) {
    throw new ServiceNotAvailableError('Identify');
  }
  return identify;
}

/**
 * Get AutoNAT service with availability check
 */
export function getAutoNATService(client: CinderlinkClientInterface): any {
  const autonat = client.ipfs.libp2p.services.autonat;
  if (!autonat) {
    throw new ServiceNotAvailableError('AutoNAT');
  }
  return autonat;
}

/**
 * Safe service access that returns undefined instead of throwing
 */
export function findDHTService(client: CinderlinkClientInterface): any {
  return client.ipfs.libp2p.services.dht;
}

export function findPubSubService(client: CinderlinkClientInterface): any {
  return client.ipfs.libp2p.services.pubsub;
}

export function findIdentifyService(client: CinderlinkClientInterface): any {
  return client.ipfs.libp2p.services.identify;
}

export function findAutoNATService(client: CinderlinkClientInterface): any {
  return client.ipfs.libp2p.services.autonat;
}