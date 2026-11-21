import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dist-electron', 'node_modules']),
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-unused-vars': 'off',
      'no-case-declarations': 'warn',
      'prefer-const': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': ['error', 'alert', 'confirm', 'prompt'],
    },
  },
  {
    files: ['src/features/shapes/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/ui', '**/ui/*', '**/ui/**', '**/persistence', '**/persistence/*', '**/persistence/**'],
          message: 'shapes.sdd: shapes module must not import from ui or persistence.',
        }],
      }],
    },
  },
  {
    files: ['src/features/io/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/store', '**/store/*', '**/store/**', '**/ui', '**/ui/*', '**/ui/**', '**/persistence', '**/persistence/*', '**/persistence/**'],
          message: 'io.sdd: io module must not import from store, ui, or persistence.',
        }],
      }],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/store/**', '**/ui/**', '**/persistence/**'],
          message: 'core module must not import from store, ui, or persistence.',
        }],
      }],
    },
  },
  {
    files: ['vite.config.*', 'eslint.config.*', 'electron/**'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
