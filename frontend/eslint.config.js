import js from '@eslint/js'
import globals from 'globals'
import { FlatCompat } from '@eslint/eslintrc'
import { defineConfig, globalIgnores } from 'eslint/config'

const compat = new FlatCompat({ baseDirectory: import.meta.url })

export default defineConfig([
  globalIgnores(['dist']),
  js.configs.recommended,
  ...compat.extends('plugin:react-hooks/recommended', 'plugin:react-refresh/vite'),
  {
    files: ['**/*.{js,jsx}'],
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
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
