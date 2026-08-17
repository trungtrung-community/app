import {defineConfig} from 'vitest/config';

/**
 * The domain, engine and use-case suites are plain TypeScript and need no React
 * Native transform — which is exactly why they are worth keeping separate from
 * component tests. `docs/06-testing.md` notes that React Native components need
 * transform setup under Vitest; that lands with the components, and does not slow
 * this suite down in the meantime.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
