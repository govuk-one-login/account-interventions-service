// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintPluginTsdoc from 'eslint-plugin-tsdoc';
import globals from 'globals';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/feature-tests/**',
      'coverage/**',
      '**/.aws-sam/**',
      '.stryker-tmp/*',
      '**/dist/**',
      '**/rollup.config.ts',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [eslint.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      globals: globals.builtin,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      tsdoc: eslintPluginTsdoc,
      unicorn: eslintPluginUnicorn,
    },
    rules: {
      '@typescript-eslint/no-floating-promises': ['error'],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': ['error'],
      '@typescript-eslint/non-nullable-type-assertion-style': ['off'],
      '@typescript-eslint/switch-exhaustiveness-check': ['error'],
      'arrow-body-style': ['error', 'as-needed'],
      'keyword-spacing': ['error', { after: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression[body.type="BlockStatement"]',
          message:
            "Top-level exported functions should use the 'function' keyword for better readability and hoisting.",
        },
      ],
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      'object-curly-spacing': ['error', 'always'],
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      'unicorn/error-message': ['error'],
      'unicorn/throw-new-error': ['error'],
      'unicorn/prefer-logical-operator-over-ternary': ['error'],
      'unicorn/no-useless-spread': ['error'],
      'unicorn/prefer-spread': ['error'],
      'unicorn/no-useless-promise-resolve-reject': ['error'],
      'unicorn/no-instanceof-builtins': ['error'],
      'unicorn/no-useless-undefined': ['error'],
      'unicorn/no-for-each': ['error'],
      'unicorn/prefer-node-protocol': ['error'],
      'unicorn/prefer-array-find': ['error'],
      'unicorn/prefer-string-starts-ends-with': ['error'],
      'tsdoc/syntax': ['error'],
      '@typescript-eslint/no-unsafe-enum-assignment': ['off']
    },
  },
  {
    files: ['feature-tests-ui/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    }
  },
);
