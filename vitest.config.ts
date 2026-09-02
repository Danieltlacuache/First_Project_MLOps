import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vitestCucumberPlugin from 'vitest-cucumber-plugin';

export default defineConfig({
  plugins: [vitestCucumberPlugin()],
  test: {
    environment: 'node',
    include: ['src/tests/**/*.{test,spec}.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
