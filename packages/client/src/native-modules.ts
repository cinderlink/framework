/**
 * Native modules wrapper that handles test mode
 * This file provides conditional imports for native modules that may not be available in test environments
 */

// Check if we're in test mode
const isTestMode = process.env.NODE_ENV === 'test' || process.env.VITEST || typeof vi !== 'undefined';

/**
 * Mock implementation for gossipsub in test mode
 */
const mockGossipsub = () => ({
  start: () => Promise.resolve(),
  stop: () => Promise.resolve(),
  publish: () => Promise.resolve(),
  subscribe: () => {},
  unsubscribe: () => {},
  getTopics: () => [],
  getPeers: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false
});

/**
 * Get gossipsub - either real implementation or mock
 */
export async function getGossipsub() {
  if (isTestMode) {
    return { gossipsub: mockGossipsub };
  }
  
  try {
    const { gossipsub } = await import('@chainsafe/libp2p-gossipsub');
    return { gossipsub };
  } catch (error) {
    console.warn('Failed to import @chainsafe/libp2p-gossipsub, using mock:', error);
    return { gossipsub: mockGossipsub };
  }
}

/**
 * Mock implementation for node-datachannel in test mode
 */
const mockDataChannel = {
  createDataChannel: () => ({
    onOpen: () => {},
    onClose: () => {},
    onError: () => {},
    onMessage: () => {},
    send: () => {},
    close: () => {},
    readyState: 'open'
  }),
  createPeerConnection: () => ({
    onDataChannel: () => {},
    onIceCandidate: () => {},
    onConnectionStateChange: () => {},
    createDataChannel: () => ({
      onOpen: () => {},
      onClose: () => {},
      onError: () => {},
      onMessage: () => {},
      send: () => {},
      close: () => {},
      readyState: 'open'
    }),
    setLocalDescription: () => Promise.resolve(),
    setRemoteDescription: () => Promise.resolve(),
    createOffer: () => Promise.resolve({ type: 'offer', sdp: 'mock-sdp' }),
    createAnswer: () => Promise.resolve({ type: 'answer', sdp: 'mock-sdp' }),
    addIceCandidate: () => Promise.resolve(),
    close: () => {},
    connectionState: 'connected'
  })
};

/**
 * Get node-datachannel - either real implementation or mock
 */
export async function getNodeDataChannel() {
  if (isTestMode) {
    return { default: mockDataChannel };
  }
  
  try {
    const nodeDataChannel = await import('@ipshipyard/node-datachannel');
    return nodeDataChannel;
  } catch (error) {
    console.warn('Failed to import @ipshipyard/node-datachannel, using mock:', error);
    return { default: mockDataChannel };
  }
}