import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 30000,
    setupFiles: ['./test-setup.ts'],
    globals: true
  }
})
