import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['dist', 'node_modules'],
    testTimeout: 15000,
    hookTimeout: 50000,
  },
});
