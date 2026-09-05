import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // These guards exist to keep server-only code out of the client
      // bundle at build time — Next.js's bundler special-cases them; plain
      // Vite/Vitest doesn't, so without this alias every server-only module
      // throws immediately when a test imports it.
      'server-only': new URL('./tests/stubs/empty.ts', import.meta.url).pathname,
      'client-only': new URL('./tests/stubs/empty.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/support/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/unit/**/*.{test,spec}.{ts,tsx}',
      'tests/integration/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    // Integration tests share one Postgres database and must not run
    // concurrently against it (enrolment/points fixtures would collide).
    fileParallelism: false,
  },
});
