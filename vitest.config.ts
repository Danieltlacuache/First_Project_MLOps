import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import vitestCucumberPlugin from 'vitest-cucumber-plugin';

const config = defineConfig({
  plugins: [vitestCucumberPlugin()],
  test: {
    environment: 'node',
    include: ['src/tests/**/*.{test,spec}.ts', 'src/tests/features/*.feature'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

// vitest-cucumber-plugin reads `test.cucumber` at runtime (see its
// `configResolved` hook) but doesn't ship a TypeScript type for that field,
// so it can't be part of the `defineConfig` object literal above without
// widening to `any`. Attach it after the fact instead.
interface CucumberTestConfig {
  cucumber: { stepDefinitions: { include: string } };
}
Object.assign(config.test as object, {
  cucumber: { stepDefinitions: { include: 'src/tests/features/*.steps.ts' } },
} satisfies CucumberTestConfig);

export default config;
