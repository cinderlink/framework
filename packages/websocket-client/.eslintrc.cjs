/* eslint-env node */
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier'],
  root: true,
  rules: {
    'prettier/prettier': 'error',
    '@typescript-eslint/member-ordering': [
      'error',
      {
        default: {
          memberTypes: ['signature', 'field', 'constructor', 'method'],
          order: 'alphabetically',
        },
      },
    ],
  },
};
