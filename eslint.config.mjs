import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  globalIgnores(['.next/**', '.open-next/**', '.tmp/**', 'worker/dist/**', 'next-env.d.ts']),
  {
    files: ['components/**/*.{ts,tsx}', 'pages/_app.tsx', 'pages/_document.tsx', 'util/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/uptime.config', '**/worker/src/index', '**/worker/src/monitor', '**/worker/src/util'], message: 'Worker entrypoints and private monitor configuration cannot be imported by client components.' }] }],
    },
  },
])
