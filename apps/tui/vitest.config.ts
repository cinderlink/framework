import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use node environment - OpenTUI's testRender handles the terminal simulation
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['node_modules', 'dist'],
    // OpenTUI tests need to run serially to avoid terminal state conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    // Fix ESM resolution for react-reconciler
    alias: {
      'react-reconciler/constants': 'react-reconciler/constants.js',
    },
  },
});
