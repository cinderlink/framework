import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: true,
      },
      globals: {
        // Node.js globals
        NodeJS: 'readonly',
        Buffer: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        // Browser globals
        CustomEvent: 'readonly',
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Prevent any type usage - NEVER USE ANY TYPES
      '@typescript-eslint/no-explicit-any': 'error',
      
      // Other strict TypeScript rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ],
      'no-unused-vars': 'off', // Turn off base rule as @typescript-eslint version is more accurate
      '@typescript-eslint/prefer-as-const': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // General code quality
      'no-console': 'off', // Allow console for now
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      // Relax some rules for test files
      'no-console': 'off',
    },
  },
  {
    // Temporarily allow any types in complex integration files while we establish the linting infrastructure
    files: [
      '**/client.ts',
      '**/did/util.ts', 
      '**/distributed-pinning.ts',
      '**/ipfs/create.ts',
      '**/protocol.ts',
      '**/identity.ts',
      '**/identifiers/**/*.ts'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn', // Warn instead of error for now
      'no-empty': 'warn', // Allow empty blocks for now in complex files
      'no-async-promise-executor': 'warn', // Allow async promise executors for now
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '**/dist/**',
      'build/**',
      '**/build/**',
      '.turbo/**',
      'coverage/**',
      '**/.tshy/**',
      '**/.tshy-build/**',
      '**/example/**/*.js',
      '**/*.js',
      '**/tsup.config.ts',
      'test-setup.ts',
    ],
  },
];