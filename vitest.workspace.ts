import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  // All packages that need DOM environment
  {
    test: {
      name: 'packages-with-dom',
      include: [
        'packages/protocol/**/*.test.ts',
        'packages/client/**/*.test.ts',
        'packages/server/**/*.test.ts',
        'packages/plugin-*/**/*.test.ts'
      ],
      environment: 'jsdom',
      setupFiles: ['./test-setup.ts']
    }
  },
  // Packages that can run in node environment
  {
    test: {
      name: 'packages-node',
      include: [
        'packages/core-types/**/*.test.ts',
        'packages/ipld-database/**/*.test.ts',
        'packages/identifiers/**/*.test.ts',
        'packages/test-adapters/**/*.test.ts'
      ],
      environment: 'node'
    }
  }
])
