import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    // Legacy / transitional code: imported for future use or gradual migration
    rules: {
      'no-unused-vars': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Hooks / providers often export components + hooks from one module
  {
    files: [
      'src/hooks/**/*.{js,jsx}',
      'src/world/**/*.{js,jsx}',
      'src/components/DelightProvider.jsx',
      'src/components/ExitIntentModal.jsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  // Decorative animation: random layout is intentional, computed once per mount
  {
    files: ['src/components/CelebrationAnimation.jsx'],
    rules: {
      'react-hooks/purity': 'off',
    },
  },
])
