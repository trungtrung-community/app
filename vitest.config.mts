import babel from 'vite-plugin-babel';
import {defineConfig} from 'vitest/config';

/**
 * Two projects, because the two layers want opposite things.
 *
 * `logic` is the domain, engine, use-case, adapter and script suites: plain TypeScript,
 * node, no transform, no doubles, milliseconds. Keeping it separate is the point — those
 * tests are the ones run constantly, and nothing about React Native should slow them.
 *
 * `components` renders through **react-native-web under jsdom**, which is a deviation from
 * `docs/06`'s plan of React Native Testing Library. RNTL was tried first and cannot run
 * here: React Native ships Flow-typed source, esbuild cannot parse it, and every import
 * dies on `Unexpected token 'typeof'`. `docs/06` permits falling back to `jest-expo` for
 * this layer, and this is the third option — one runner instead of two, no Babel pipeline,
 * and the components are exercised through exactly the path the browser check already
 * walks, so a test and a screenshot cannot disagree about what rendered.
 *
 * What that costs: these are DOM assertions, so they prove the web build. Platform
 * behaviour that differs on a device — Android's nested-Text line height, the native
 * keycap shadow — is still only provable on a device. The suite is honest about which
 * half it covers.
 *
 * `integration` is the third, for tests that cross several architectural pieces and so
 * belong to no single module — see `docs/11-testing-conventions.md` §2. It is empty as of
 * 2026-08-17, because `src/engine/` and `src/usecases/` have no files yet, which is why
 * `passWithNoTests` is set: an empty project should not fail a run that has 121 passing
 * tests in it.
 *
 * `tests/e2e/**` is excluded from all three. Playwright is a separate runner and driving
 * it from Vitest would put two tools in charge of one suite.
 */
export default defineConfig({
  plugins: [
    // Metro runs this plugin; without it Reanimated refuses every hook that has no explicit
    // dependency array. Passing those arrays by hand would be test-driven damage — the
    // components would carry an argument that exists only because the runner is not Metro.
    babel({
      include: /src[\\/].*\.tsx$/,
      babelConfig: {
        babelrc: false,
        configFile: false,
        presets: [['@babel/preset-typescript', {isTSX: true, allExtensions: true}]],
        plugins: ['react-native-worklets/plugin'],
      },
    }),
  ],
  resolve: {
    alias: [
      // The ESM build. The `main` field is CommonJS that requires React Native's Flow
      // source, which Node loads directly and cannot parse.
      {find: /^react-native-svg$/, replacement: 'react-native-svg/lib/module/index.js'},
      {find: /^react-native$/, replacement: 'react-native-web'},
    ],
    // `.web.js` first, which is how Metro picks a platform file and how these packages
    // expect to be resolved for the web.
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  // React Native's own global. Reanimated reads it while being imported.
  define: {__DEV__: 'true'},
  test: {
    passWithNoTests: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    projects: [
      {
        extends: true,
        test: {
          name: 'logic',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          include: ['src/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          // Transformed by Vite rather than required by Node: each of these ships either
          // extensionless imports or platform files that only a bundler resolves.
          server: {
            deps: {
              inline: [
                /react-native-svg/,
                /lucide-react-native/,
                /react-native-reanimated/,
                /react-native-worklets/,
                /uniwind/,
              ],
            },
          },
        },
      },
    ],
  },
});
