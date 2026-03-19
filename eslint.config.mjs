// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintPluginTsdoc from 'eslint-plugin-tsdoc';
import globals from 'globals';

export default defineConfig(
  eslintPluginUnicorn.configs['flat/recommended'],
  {
    ignores: ['**/node_modules/**', '**/feature-tests/**', '**/*.test.ts', 'coverage/**', '**/.aws-sam/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      globals: globals.builtin,
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      // unicorn: eslintPluginUnicorn,
      tsdoc: eslintPluginTsdoc,
    },
    rules: {
      '@typescript-eslint/no-floating-promises': ['error'],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': ['error'],
      '@typescript-eslint/non-nullable-type-assertion-style': ['off'],
      '@typescript-eslint/switch-exhaustiveness-check': ['error'],
      'arrow-body-style': ['error', 'as-needed'],
      'keyword-spacing': ['error', { after: true }],
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      'object-curly-spacing': ['error', 'always'],
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      'unicorn/prevent-abbreviations': ['off'],
      'unicorn/prefer-string-raw': ['off'],
      'unicorn/error-message': ['warn'],
      'unicorn/no-array-reduce': ['off'],
      'unicorn/prefer-logical-operator-over-ternary': ['error'],
      'unicorn/prefer-spread': ['error'],
      'unicorn/prefer-ternary': ['error'],
      'unicorn/no-array-for-each': ['error'],
      'tsdoc/syntax': ['error'],
    },
  },
);
