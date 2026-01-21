import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['dist', 'node_modules'],
    testTimeout: 50000,
    hookTimeout: 50000,
    coverage: {
      provider: 'istanbul',
      reporter: ['text'],
    },
  },
});
