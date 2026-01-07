// Mock for @libp2p/webrtc to avoid native module issues in tests
export default {
  webRTC: () => ({
    dial: () => Promise.resolve({
      stream: {
        sink: async () => {},
        source: async function* () {},
      }
    }),
    createListener: () => ({
      listen: () => Promise.resolve(),
      close: () => Promise.resolve(),
      getAddrs: () => []
    })
  })
};
EOF < /dev/null