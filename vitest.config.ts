import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'packages/shared/src'),
      '@db': resolve(__dirname, 'packages/db/src'),
      '@background': resolve(__dirname, 'packages/background/src'),
    },
  },
});