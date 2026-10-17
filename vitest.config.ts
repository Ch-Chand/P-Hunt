import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: {
    alias: {
      '@research/domain': fileURLToPath(new URL('./packages/domain/src/index.ts', import.meta.url)),
      '@research/fixtures': fileURLToPath(
        new URL('./packages/fixtures/src/index.ts', import.meta.url),
      ),
    },
  },
  test: { include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'], environment: 'node' },
});
