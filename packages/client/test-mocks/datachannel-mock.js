// Mock for @ipshipyard/node-datachannel to avoid native module loading in tests
export default {};
export const PeerConnection = class MockPeerConnection {};
export const DataChannel = class MockDataChannel {};