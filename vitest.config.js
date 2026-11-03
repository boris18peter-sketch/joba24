import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Test runner config — deliberately separate from vite.config.js, so the app's
 * build (and the Base44 plugin that runs inside it) is never loaded by tests.
 * Only the `@/` alias the source files themselves use is mirrored here.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
  },
});