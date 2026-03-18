// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintPluginTsdoc from 'eslint-plugin-tsdoc';
import globals from 'globals';

export default defineConfig(
  {
    ignores: ['**/node_modules/**', '**/feature-tests/**', '**/*.test.ts', 'coverage/**', '**/.aws-sam/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.strictTypeChecked],
    languageOptions: {
      globals: globals.builtin,
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      unicorn: eslintPluginUnicorn,
      tsdoc: eslintPluginTsdoc,
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
      'unicorn/prefer-string-raw': ['off'],
      'unicorn/error-message': ['warn'],
      'unicorn/no-array-reduce': ['off'],
      'unicorn/prefer-logical-operator-over-ternary': ['warn'],
      'unicorn/prefer-spread': ['warn'],
      'tsdoc/syntax': ['warn'],
    },
  },
);
