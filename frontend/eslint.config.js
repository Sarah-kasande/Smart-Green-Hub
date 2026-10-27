import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'e2e-report', 'test-results']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Components copied in by the shadcn/ui and Magic UI tools (UI.md). They are third-party code kept
  // as published, so a few style rules that do not fit them are relaxed here only.
  {
    files: ['src/components/shadcn/**/*.jsx'],
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$' }],
      'react-refresh/only-export-components': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
    },
  },
  // End-to-end tests and the Playwright config run in Node.js, not in the browser
  {
    files: ['e2e/**/*.js', 'playwright.config.js'],
    languageOptions: { globals: globals.node },
  },
])
