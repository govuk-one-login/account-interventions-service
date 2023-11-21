module.exports = {
  plugins: [
    "eslint-plugin-tsdoc"
  ],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended', 'plugin:unicorn/recommended'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    project: ['./tsconfig.json', './feature-tests/tsconfig.json'],
    sourceType: 'module',
  },
  rules: {
    '@typescript-eslint/no-floating-promises': ['error'],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': ['warn'],
    'keyword-spacing': ['error', { after: true }],
    'space-before-blocks': ['error', 'always'],
    'space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
    'object-curly-spacing': ['error', 'always'],
    'unicorn/filename-case': ['error', { case: 'kebabCase' }],
    'unicorn/prevent-abbreviations': ['warn'],
    'unicorn/error-message': ['warn'],
    'unicorn/prefer-logical-operator-over-ternary': ['warn'],
    'unicorn/prefer-spread': ['warn'],
    'tsdoc/syntax': ['warn'],
  },
};
