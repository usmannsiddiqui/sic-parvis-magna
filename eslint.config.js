import js from '@eslint/js';
import ts from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
  {
    ignores: [
      'dist/',
      '.astro/',
      'node_modules/',
      '.claude/',
      'playwright-report/',
      'test-results/',
    ],
  },
];
