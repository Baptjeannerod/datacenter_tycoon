import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['engine/**/*.test.ts', 'scripts/**/*.test.ts', 'ui/**/*.test.ts', 'api/**/*.test.ts'],
  },
});
