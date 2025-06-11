import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Mock problematic native modules that cause datachannel issues
      '@ipshipyard/node-datachannel': new URL('./test-mocks/datachannel-mock.js', import.meta.url).pathname,
      '@libp2p/webrtc': new URL('./test-mocks/webrtc-mock.js', import.meta.url).pathname,
    },
  },
});