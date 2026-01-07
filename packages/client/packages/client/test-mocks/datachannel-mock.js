// Mock for @ipshipyard/node-datachannel to avoid native module issues in tests
export default {};

export class RTCPeerConnection {
  constructor() {
    this.localDescription = null;
    this.remoteDescription = null;
  }
  
  createDataChannel() {
    return {
      addEventListener: () => {},
      removeEventListener: () => {},
      send: () => {},
      close: () => {},
    };
  }
  
  createOffer() {
    return Promise.resolve({
      type: 'offer',
      sdp: 'mock-sdp-offer'
    });
  }
  
  createAnswer() {
    return Promise.resolve({
      type: 'answer',
      sdp: 'mock-sdp-answer'
    });
  }
  
  setLocalDescription(desc) {
    this.localDescription = desc;
    return Promise.resolve();
  }
  
  setRemoteDescription(desc) {
    this.remoteDescription = desc;
    return Promise.resolve();
  }
  
  addIceCandidate() {
    return Promise.resolve();
  }
  
  close() {
    // Mock close
  }
}
EOF < /dev/null