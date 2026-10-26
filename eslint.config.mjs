import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'storage/**',
    'docs/reports/**',
    'test-results/**',
    'playwright-report/**',
    'next-env.d.ts',
  ]),
]);
