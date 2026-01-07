import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use jsdom for hook tests that need DOM (e.g., @testing-library/react)
    environment: 'jsdom',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // Only include hook tests, exclude OpenTUI component tests
    include: ['src/hooks/**/*.test.ts', 'src/hooks/**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'src/__tests__/**'],
  },
});
