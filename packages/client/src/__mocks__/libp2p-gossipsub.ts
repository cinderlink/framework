/**
 * Mock for @chainsafe/libp2p-gossipsub
 */

const mockGossipsubInstance = {
  start: () => Promise.resolve(),
  stop: () => Promise.resolve(),
  publish: () => Promise.resolve(),
  subscribe: () => {},
  unsubscribe: () => {},
  getTopics: () => [],
  getPeers: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
  allowPublishToZeroPeers: true,
  globalSignaturePolicy: 'StrictNoSign' as const,
  emitSelf: false,
  D: 2,
  Dlo: 1,
  Dhi: 4
};

export function gossipsub(config?: any) {
  return mockGossipsubInstance;
}

export default {
  gossipsub
};