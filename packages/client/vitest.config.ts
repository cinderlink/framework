import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // Mock problematic native modules that cause datachannel issues
      '@ipshipyard/node-datachannel': false,
    },
  },
});