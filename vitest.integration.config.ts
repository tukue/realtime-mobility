import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/integration/**/*.test.tsx'],
    maxWorkers: 1,
    fileParallelism: false,
    testTimeout: 60_000,
  },
});
