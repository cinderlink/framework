// Hoisted mocks - these need to be at the top level
// Plain mock exports - no test API needed in mock files themselves

// Mock for @ipshipyard/node-datachannel
const mockDataChannel = {
  onOpen: () => {},
  onClose: () => {},
  onError: () => {},
  onMessage: () => {},
  send: () => {},
  close: () => {},
  readyState: 'open' as const
};

const mockPeerConnection = {
  onDataChannel: () => {},
  onIceCandidate: () => {},
  onConnectionStateChange: () => {},
  createDataChannel: () => mockDataChannel,
  setLocalDescription: () => Promise.resolve(),
  setRemoteDescription: () => Promise.resolve(),
  createOffer: () => Promise.resolve({ type: 'offer', sdp: 'mock-sdp' }),
  createAnswer: () => Promise.resolve({ type: 'answer', sdp: 'mock-sdp' }),
  addIceCandidate: () => Promise.resolve(),
  close: () => {},
  connectionState: 'connected' as const
};

export default {
  createDataChannel: () => mockDataChannel,
  createPeerConnection: () => mockPeerConnection
};

export {
  mockDataChannel,
  mockPeerConnection
};
