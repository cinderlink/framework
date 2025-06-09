// Mock for @libp2p/webrtc to avoid native module dependencies in tests
export function webRTC() {
  return {
    [Symbol.toStringTag]: 'webRTC',
    dial: () => Promise.reject(new Error('WebRTC not available in test mode')),
  };
}