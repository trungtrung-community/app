/**
 * @fileoverview What eslint structurally cannot see: cycles, orphans, transitive reach.
 *
 * **This file states no layering rule of its own.** `eslint.config.js` owns layering, via
 * eslint-plugin-boundaries, and gets it as a red squiggle while an import is being typed.
 * Restating those rules here would be two authorities for one decision and they would
 * drift, so the only overlap below is deliberate and is a different assertion:
 *
 *   boundaries  — may this file import that one?          per import, direct
 *   here        — can this layer REACH that one at all?   whole graph, transitive
 *
 * The second is the one that actually proves the seam. A per-import rule is satisfied by
 * `domain -> a -> b -> infra` as long as no single hop is illegal; a reachability rule is
 * not. Nothing in the app is written that way today, and this is what keeps it so.
 *
 * Usage:  npm run depcruise
 *         npx depcruise src app scripts --output-type dot | dot -T svg > graph.svg
 */

/** Entry points and leaves: reached by a runtime or a runner, never by an import. */
const NOT_REALLY_ORPHANS = [
  // expo-router discovers routes by file path. Nothing imports them, by design.
  '^app/',
  // A test is run, not imported.
  '\\.test\\.tsx?$',
  // Config, and the generated type surface Uniwind's Metro plugin writes.
  '\\.(config|setup)\\.(js|ts|mts|cjs|mjs)$',
  '\\.d\\.ts$',
  // scripts/ are invoked by npm, and the gallery is reached through a route.
  '^scripts/',
  // Port declared ahead of its adapter: the expo-file-system/-sharing/-document-picker
  // adapter and the U2/U3 screens land in a follow-up task. Remove when they do.
  '^src/ports/backup-files\\.ts$',
];

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      comment:
        'A cycle means neither module can be understood, tested or removed on its own. ' +
        'Nothing checked for this before 2026-08-17, and the component tree is acyclic ' +
        'only because it was ported in dependency tiers — this is what keeps it that way ' +
        'as screens land on top of it.',
      severity: 'error',
      from: {},
      to: {circular: true},
    },
    {
      name: 'no-orphans',
      comment:
        'A module nobody imports is either dead or was meant to be wired up and was not. ' +
        'Entry points are excepted above by path, never by silence.',
      severity: 'error',
      from: {orphan: true, pathNot: NOT_REALLY_ORPHANS},
      to: {},
    },
    {
      name: 'not-to-unresolvable',
      comment: 'An import that does not resolve is a crash the type-checker happened to miss.',
      severity: 'error',
      from: {},
      to: {couldNotResolve: true},
    },
    {
      name: 'pure-layers-cannot-reach-the-platform',
      comment:
        'src/domain, src/engine, src/usecases and src/ports must not reach an adapter, a ' +
        'component or a store BY ANY PATH. eslint-plugin-boundaries already refuses each ' +
        'of those as a direct import; this is the transitive form, which a per-import rule ' +
        'cannot express — and it is the assertion that the ports seam actually holds ' +
        'rather than merely being declared.',
      severity: 'error',
      from: {path: '^src/(domain|engine|usecases|ports)/'},
      to: {path: '^src/(infra|components|store)/', reachable: true},
    },
    {
      name: 'no-duplicate-dep-types',
      comment:
        'A package listed as both a dependency and a devDependency resolves to whichever ' +
        'the installer saw last, which is not a decision anyone made.',
      severity: 'error',
      from: {},
      to: {moreThanOneDependencyType: true, dependencyTypesNot: ['type-only']},
    },
  ],

  options: {
    doNotFollow: {path: 'node_modules'},
    // Generated, and vendored verbatim from the design system. Not ours to restructure.
    exclude: {path: '(^|/)(node_modules|dist|\\.expo)/|src/theme/.*\\.generated\\.'},
    tsConfig: {fileName: 'tsconfig.json'},
    // Without this, `import type {Progress} from '...'` is invisible, and a type-only
    // import across a boundary is still a boundary crossed.
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      mainFields: ['module', 'main', 'types'],
    },
    reporterOptions: {
      dot: {collapsePattern: 'node_modules/(@[^/]+/[^/]+|[^/]+)'},
      archi: {collapsePattern: '^(src/[^/]+|app|scripts)'},
    },
  },
};
