/**
 * @fileoverview sync-design — pull design tokens from the design-system repo.
 *
 *   node scripts/sync-design.ts            regenerate
 *   node scripts/sync-design.ts --check    fail if regenerating would change anything
 *
 * What it does
 *   1. Locates the design system (TRUNGTRUNG_DS_PATH, default ../design-system).
 *   2. Vendors the token CSS verbatim into src/theme/tokens/ — a pristine mirror,
 *      so this repo builds with the design system absent and an upstream change
 *      is a readable diff.
 *   3. Emits src/theme/theme.generated.css: a Tailwind v4 `@theme static` block,
 *      `@utility` rules for the composed type roles, and a `:root` block carrying
 *      passthrough tokens plus aliases under their original design-system names.
 *   4. Emits src/theme/tokens.generated.ts: the same tokens as typed values with
 *      lengths already resolved to numbers, for the places a className cannot
 *      reach — react-native-svg props, Reanimated values, imperative styles.
 *
 * Why vendor rather than path-reference: the board export is regenerated
 * top-down and local edits are discarded, and _ds/UPSTREAM-SYNC-2026-08-16.md
 * records four tokens that exist only in the local copy. A pinned mirror is the
 * only stable contract.
 *
 * Ported from `website/scripts/sync-design.ts`. Divergences are all downstream of
 * React Native selecting a single font face and synthesising no weight; see
 * docs/spikes/2026-08-17-tibetan-rendering.md.
 */

import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  FAMILIES,
  RULES,
  SCRUB,
  TOKEN_FILES,
  WEIGHT_VALUES,
  bundledFaces,
  resolve,
  resolveFamily,
  weightWord,
} from './token-map.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THEME_DIR = path.join(REPO, 'src', 'theme');
const VENDOR_DIR = path.join(THEME_DIR, 'tokens');
const OUT_CSS = path.join(THEME_DIR, 'theme.generated.css');
const OUT_TS = path.join(THEME_DIR, 'tokens.generated.ts');
const OUT_FONTS = path.join(THEME_DIR, 'fonts.generated.ts');
const OUT_LOCK = path.join(THEME_DIR, 'tokens.lock.json');

const CHECK = process.argv.includes('--check');

/** Uniwind resolves rem against a 16px root, so lengths convert at 16. */
const REM = 16;

// ── locating the design system ──────────────────────────────────────────────

function findTokensDir(): string {
  const dsRoot = process.env.TRUNGTRUNG_DS_PATH ?? path.resolve(REPO, '..', 'design-system');
  const exportRoot = path.join(dsRoot, 'Trungtrung app - all screens', '_ds');

  if (!fs.existsSync(exportRoot)) {
    fail(
      `Design system not found at ${exportRoot}\n` +
        `Set TRUNGTRUNG_DS_PATH to the design-system repo root.`,
    );
  }

  // The export directory is named after a project UUID that changes between
  // exports, so match on structure rather than on the name.
  const candidates = fs
    .readdirSync(exportRoot, {withFileTypes: true})
    .filter(e => e.isDirectory())
    .map(e => path.join(exportRoot, e.name, 'tokens'))
    .filter(p => fs.existsSync(p));

  if (candidates.length === 0) {
    fail(`No */tokens directory under ${exportRoot}`);
  }
  if (candidates.length > 1) {
    console.warn(`warning: ${candidates.length} token directories found; using ${candidates[0]}`);
  }
  return candidates[0] as string;
}

function fail(message: string): never {
  console.error(`sync-design: ${message}`);
  process.exit(1);
}

// ── parsing ─────────────────────────────────────────────────────────────────

type Decl = {
  name: string;
  value: string;
  file: string;
  /** The comment block(s) this declaration sits under, one entry per block. */
  section?: string[];
  /** Trailing comment on the declaration itself. */
  note?: string;
};

/** Everything between the outermost braces of each `:root { … }` rule. */
function rootBodies(css: string): string[] {
  const bodies: string[] = [];
  const re = /:root\s*\{/g;
  while (re.exec(css)) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') {
        depth++;
      } else if (css[i] === '}') {
        depth--;
      }
      i++;
    }
    bodies.push(css.slice(re.lastIndex, i - 1));
  }
  return bodies;
}

function scrub(text: string): string {
  return SCRUB.reduce((acc, [re, to]) => acc.replace(re, to), text).trim();
}

function tidy(text: string): string {
  // Drop the box-drawing rules the design system uses to underline section
  // headings; they carry no meaning once the comment is re-wrapped.
  return scrub(text.replace(/[─—]{2,}/g, '').replace(/\s+/g, ' '));
}

function parseTokens(css: string, file: string): Decl[] {
  const out: Decl[] = [];
  let section: string[] | undefined;
  let blocks: string[] = [];
  let block: string[] = [];
  let inComment = false;

  const closeBlock = () => {
    const text = tidy(block.join(' '));
    if (text) {
      blocks.push(text);
    }
    block = [];
  };

  for (const raw of rootBodies(css).join('\n').split('\n')) {
    const line = raw.trim();

    if (inComment) {
      block.push(line.replace(/\*\/\s*$/, '').replace(/^\*+\s?/, ''));
      if (line.includes('*/')) {
        inComment = false;
        closeBlock();
      }
      continue;
    }

    if (line.startsWith('/*')) {
      const closed = line.includes('*/');
      block.push(line.replace(/^\/\*+/, '').replace(/\*\/\s*$/, ''));
      inComment = !closed;
      if (closed) {
        closeBlock();
      }
      continue;
    }

    const decl = line.match(/^--([\w-]+)\s*:\s*([^;]+);(.*)$/);
    if (!decl) {
      continue;
    }

    // Comment blocks immediately above a declaration head a new section. Each
    // block stays its own line so a heading and its gloss don't run together.
    if (blocks.length) {
      section = blocks;
      blocks = [];
    }

    const notes = [...(decl[3] ?? '').matchAll(/\/\*([^*]*)\*\//g)]
      .map(c => scrub(c[1] ?? ''))
      .filter(c => c && !c.startsWith('@kind'));

    out.push({
      name: decl[1] as string,
      value: (decl[2] as string).trim(),
      file,
      section,
      note: notes.length ? notes.join(' — ') : undefined,
    });
  }

  return out;
}

// ── mapping ─────────────────────────────────────────────────────────────────

type Kind = 'theme' | 'passthru' | 'compose';
type Mapped = Decl & {target: string; kind: Kind};

function mapTokens(decls: Decl[]): {mapped: Mapped[]; dropped: Decl[]} {
  const mapped: Mapped[] = [];
  const dropped: Decl[] = [];

  for (const d of decls) {
    const hit = resolve(d.file, d.name);
    if (!hit) {
      console.warn(`warning: no rule for --${d.name} in ${d.file}; passing through`);
      mapped.push({...d, target: d.name, kind: 'passthru'});
      continue;
    }
    const {rule, match} = hit;

    if (rule.to === 'drop') {
      dropped.push(d);
    } else if (rule.to === 'passthru') {
      mapped.push({...d, target: d.name, kind: 'passthru'});
    } else if (rule.to === 'compose') {
      mapped.push({...d, target: d.name, kind: 'compose'});
    } else {
      mapped.push({...d, target: rule.to(d.name, match), kind: 'theme'});
    }
  }

  return {mapped, dropped};
}

/**
 * Rewrite `var(--x)` references to their mapped names, so a semantic token like
 * `--surface-app: var(--ground-100)` becomes
 * `--color-surface-app: var(--color-ground-100)`.
 *
 * `var()` chains are deliberately NOT flattened here: keeping the primitive ->
 * semantic layering is what makes a palette change a one-line edit.
 */
function rewriteRefs(value: string, lookup: Map<string, string>): string {
  return value.replace(/var\(\s*--([\w-]+)/g, (whole, name: string) => {
    const target = lookup.get(name);
    return target ? `var(--${target}` : whole;
  });
}

/** Resolve a var() chain down to a literal, for the places CSS indirection cannot go. */
function flatten(value: string, byName: Map<string, string>, seen = new Set<string>()): string {
  return value.replace(/var\(\s*--([\w-]+)\s*\)/g, (whole, name: string) => {
    if (seen.has(name)) {
      return whole;
    }
    const next = byName.get(name);
    if (next === undefined) {
      return whole;
    }
    return flatten(next, byName, new Set([...seen, name]));
  });
}

/**
 * Precompute every `color-mix()` in a value to an rgba literal.
 *
 * React Native has no color-mix. Each use in the system mixes a flat ink with
 * `transparent`, which rgba expresses exactly.
 *
 * Substitutes in place rather than replacing the whole value: five of the six uses
 * sit inside a box-shadow, so returning just the colour would silently drop the
 * offset and blur (`inset 0 2px 0 0 color-mix(…)` -> `rgba(…)`).
 */
function resolveColorMix(value: string, byName: Map<string, string>): string {
  return value.replace(
    /color-mix\(\s*in\s+[\w-]+\s*,\s*([^,]+?)\s+([\d.]+)%\s*,\s*transparent\s*\)/g,
    (whole, base: string, pct: string) => {
      const hex = flatten(base, byName).trim();
      const rgb = hexToRgb(hex);
      if (!rgb) {
        console.warn(`warning: could not resolve color-mix base "${hex}"`);
        return whole;
      }
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Number(pct) / 100})`;
    },
  );
}

function hexToRgb(hex: string): {r: number; g: number; b: number} | null {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) {
    return null;
  }
  const n = parseInt(m[1] as string, 16);
  return {r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255};
}

/** Split a CSS `font` shorthand of the fixed form `weight size / leading family`. */
function decompose(value: string) {
  const m = value.match(/^(?:(italic)\s+)?(\S+)\s+(\S+)\s*\/\s*(\S+)\s+(.+)$/);
  if (!m) {
    return null;
  }
  return {
    italic: Boolean(m[1]),
    weight: m[2] as string,
    size: m[3] as string,
    leading: m[4] as string,
    family: (m[5] as string).trim(),
  };
}

/** The DS font token named inside a composed role's family slot, e.g. `font-body`. */
function familyTokenOf(family: string): string | null {
  const m = family.match(/var\(\s*--([\w-]+)\s*\)/);
  return m ? (m[1] as string) : null;
}

/** The numeric weight a composed role asks for, following `--weight-*` indirection. */
function weightValueOf(weight: string): number {
  const m = weight.match(/var\(\s*--([\w-]+)\s*\)/);
  if (m) {
    return WEIGHT_VALUES[m[1] as string] ?? 400;
  }
  const n = Number(weight);
  return Number.isFinite(n) ? n : 400;
}

// ── emitting ────────────────────────────────────────────────────────────────

/**
 * Make text safe to sit inside a CSS comment. A stray `*​/` — which a glob like
 * `_ds/<project>/tokens/` very nearly is — closes the comment early and spills
 * the rest of the file into the stylesheet as garbage.
 */
function safeComment(text: string): string {
  return text.replace(/\*\//g, '*​/');
}

type SourceHash = {file: string; sha256: string; bytes: number};

/**
 * Every (family, weight) face the bundle registers, as `--font-<token>-<word>`.
 *
 * Aliases and the literal mono family produce nothing: `--font-tibetan-serif` is
 * `--font-tibetan`, and duplicating its faces under a second name would double
 * the surface for no gain.
 */
function familyVariants(): Array<{name: string; family: string}> {
  const out: Array<{name: string; family: string}> = [];
  for (const [token, entry] of Object.entries(FAMILIES)) {
    if ('alias' in entry || 'literal' in entry) {
      continue;
    }
    for (const weight of entry.faces) {
      const family = resolveFamily(token, weight);
      if (family) {
        out.push({name: `${token}-${weightWord(weight)}`, family});
      }
    }
    for (const weight of entry.italics ?? []) {
      const family = resolveFamily(token, weight, true);
      if (family) {
        out.push({name: `${token}-${weightWord(weight)}-italic`, family});
      }
    }
  }
  return out;
}

function emitCss(mapped: Mapped[], dropped: Decl[], sources: SourceHash[], byName: Map<string, string>): string {
  const lookup = new Map(mapped.map(d => [d.name, d.target]));
  const L: string[] = [];

  L.push('/* ============================================================');
  L.push('   GENERATED FILE — DO NOT EDIT.');
  L.push('');
  L.push('   Regenerate with:  npm run sync:design');
  L.push('   Verify with:      npm run sync:design -- --check');
  L.push('');
  L.push('   Source: design-system  Trungtrung app - all screens/_ds/<project>/tokens/');
  for (const s of sources) {
    L.push(`     ${s.file.padEnd(18)} sha256 ${s.sha256.slice(0, 16)}`);
  }
  L.push('');
  L.push('   The namespace mapping lives in scripts/token-map.ts — edit that,');
  L.push('   never this file.');
  L.push('   ============================================================ */');
  L.push('');

  // ---- @theme -------------------------------------------------------------
  // `static` guarantees every token reaches :root even when no utility uses it,
  // which the design-system alias block below depends on.
  L.push('@theme static {');
  let section: string | undefined;
  let file: string | undefined;
  for (const d of mapped.filter(m => m.kind === 'theme')) {
    if (d.file !== file) {
      file = d.file;
      section = undefined;
      L.push(`${L.length ? '\n' : ''}  /* ── ${d.file} ──────────────────────────────── */`);
    }
    const key = d.section?.join('\n');
    if (key && key !== section) {
      section = key;
      L.push('');
      for (const line of d.section ?? []) {
        L.push(`  /* ${safeComment(line)} */`);
      }
    }

    // color-mix resolves first, because it needs the ORIGINAL token names to look
    // its base colour up; rewriteRefs would have renamed them out from under it.
    let value = rewriteRefs(resolveColorMix(d.value, byName), lookup);

    if (d.file === 'fonts.css') {
      // The CSS stack collapses to the single bundled default face. React Native
      // has no fallback mechanism, so a stack here would silently render whichever
      // family the platform happens to recognise.
      const entry = FAMILIES[d.name];
      if (entry && 'alias' in entry) {
        value = `var(--${entry.alias})`;
      } else {
        const resolved = resolveFamily(d.name);
        if (!resolved) {
          fail(`no bundled face for --${d.name}; add it to FAMILIES in token-map.ts`);
        }
        value = resolved;
      }
    }
    L.push(`  --${d.target}: ${value};${d.note ? ` /* ${safeComment(d.note)} */` : ''}`);
  }

  L.push('');
  L.push('  /* ── per-weight faces ─────────────────────────────────── */');
  L.push('  /* React Native ignores font-weight on a bundled family and synthesises');
  L.push('     nothing, so each weight is its own registered family and needs its own');
  L.push('     token. Phase 0 spike finding 3: requesting weight 700 on the regular');
  L.push('     face rendered pixel-identically to the control. */');
  for (const v of familyVariants()) {
    L.push(`  --${v.name}: ${v.family};`);
  }

  L.push('');
  L.push("  /* Match Tailwind's dynamic spacing scale to the 4px design-system base,");
  L.push('     so p-9 and friends stay on grid even without a named token. */');
  L.push('  --spacing: 4px;');
  L.push('}');
  L.push('');

  // ---- @utility for the composed type roles --------------------------------
  const composed = mapped.filter(m => m.kind === 'compose');
  if (composed.length) {
    L.push('/* Composed type roles. The design system stores these as a CSS `font`');
    L.push('   shorthand, which cannot survive into React Native: the shorthand resets');
    L.push('   letter-spacing, and its weight component does nothing on a bundled face.');
    L.push('   Each role therefore resolves (family, weight) to the ONE family that is');
    L.push('   that weight, and font-weight is deliberately not emitted — on the web');
    L.push('   build it would synthesise a second bold on top of an already-bold face. */');
    for (const d of composed) {
      const parts = decompose(d.value);
      if (!parts) {
        console.warn(`warning: could not decompose --${d.name}: ${d.value}`);
        continue;
      }
      const token = familyTokenOf(parts.family);
      const weight = weightValueOf(parts.weight);
      const family = token ? resolveFamily(token, weight, parts.italic) : null;
      if (!family) {
        // Never substitute a nearby weight: the role would then render in a face
        // the design system did not choose, and nothing would say so.
        fail(
          `--${d.name} wants --${token} at weight ${weight}${parts.italic ? ' italic' : ''}, ` +
            `which is not bundled. Add it to FAMILIES in token-map.ts, or change the role.`,
        );
      }
      L.push(`@utility ${d.target} {`);
      L.push(`  font-family: ${family};`);
      L.push(`  font-size: ${rewriteRefs(parts.size, lookup)};`);
      L.push(`  line-height: ${rewriteRefs(parts.leading, lookup)};`);
      if (parts.italic) {
        L.push('  font-style: italic;');
      }
      L.push('}');
    }
    L.push('');
  }

  // ---- :root passthrough + design-system aliases ---------------------------
  L.push(':root {');
  L.push('  /* Tokens with no Tailwind namespace — used via var() or tokens.generated.ts. */');
  file = undefined;
  for (const d of mapped.filter(m => m.kind === 'passthru')) {
    if (d.file !== file) {
      file = d.file;
      L.push(`\n  /* ${d.file} */`);
    }
    L.push(
      `  --${d.target}: ${rewriteRefs(d.value, lookup)};${d.note ? ` /* ${safeComment(d.note)} */` : ''}`,
    );
  }

  const aliases = mapped.filter(m => m.kind !== 'passthru' && m.name !== m.target);
  if (aliases.length) {
    L.push('');
    L.push('  /* Aliases under the original design-system names, so styles copied from');
    L.push('     the design system read verbatim. */');
    for (const d of aliases) {
      L.push(`  --${d.name}: var(--${d.target});`);
    }
  }
  L.push('}');
  L.push('');

  if (dropped.length) {
    L.push(`/* ${dropped.length} tokens dropped by scripts/token-map.ts:`);
    const byRule = new Map<string, string[]>();
    for (const d of dropped) {
      const why =
        RULES.find(r => r.file === d.file && r.to === 'drop' && d.name.match(r.match))?.why ??
        'dropped';
      byRule.set(why, [...(byRule.get(why) ?? []), `--${d.name}`]);
    }
    for (const [why, names] of byRule) {
      L.push(`     ${safeComment(why)}`);
      L.push(`       ${names.join(', ')}`);
    }
    L.push(' */');
    L.push('');
  }

  return L.join('\n');
}

// ── the typed token module ──────────────────────────────────────────────────

/**
 * Groups for tokens.generated.ts, in declaration order. First match wins.
 *
 * `strip` removes the group's own prefix from each key, so the scale reads as
 * `fontSize.md` rather than `fontSize.textMd`. Keys that stop being valid
 * identifiers once stripped are quoted.
 */
const TS_GROUPS: Array<{
  name: string;
  doc: string;
  test: (d: Decl) => boolean;
  strip?: RegExp;
}> = [
  {
    name: 'color',
    doc: 'Every palette and semantic colour, flattened to a literal.',
    test: d => d.file === 'colors.css',
  },
  {
    name: 'fontSize',
    doc: 'The Latin and Tibetan size ramps, in points.',
    test: d => d.file === 'typography.css' && d.name.startsWith('text-'),
    strip: /^text-/,
  },
  {
    name: 'leading',
    doc: 'Line-height multipliers. Multiply by the font size — React Native takes an absolute lineHeight, not a ratio.',
    test: d => d.name.startsWith('leading-'),
    strip: /^leading-/,
  },
  {
    name: 'tracking',
    doc: 'Letter spacing, left in em. React Native measures letterSpacing in points, so an em value has to be resolved against the size of the role using it.',
    test: d => d.name.startsWith('tracking-'),
    strip: /^tracking-/,
  },
  {
    name: 'weight',
    doc: 'CSS weight numbers, for reference. React Native ignores fontWeight on a bundled family — use fontFamily instead.',
    test: d => d.name.startsWith('weight-'),
    strip: /^weight-/,
  },
  {
    name: 'space',
    doc: 'The spacing scale, in points.',
    test: d => d.name.startsWith('space-'),
    strip: /^space-/,
  },
  {
    name: 'layout',
    doc:
      'Fixed layout constants: gutters, bar heights, rail geometry, measures. ' +
      'The two `ch` measures stay strings — a character width depends on the font ' +
      'and size of whatever is being constrained, so it can only be resolved at the ' +
      'call site. On a phone both measures are wider than the screen, so they rarely bind.',
    test: d => d.file === 'spacing.css',
  },
  {
    name: 'radius',
    doc: 'Corner radii, in points. --radius-pill is a large constant, not a percentage.',
    test: d => d.name.startsWith('radius-'),
    strip: /^radius-/,
  },
  {
    name: 'elevation',
    doc: 'Shadows, edges and rings. The box-shadow strings pass to React Native boxShadow on the new architecture; the bare lengths are points.',
    test: d => d.file === 'elevation.css',
  },
  {
    name: 'motion',
    doc: 'Durations in milliseconds, easing curves as CSS strings, and the press constants.',
    test: d => d.file === 'motion.css',
  },
];

function camel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** A camelCased key, quoted when it is not a valid JavaScript identifier. */
function keyOf(name: string, strip?: RegExp): string {
  const key = camel(strip ? name.replace(strip, '') : name);
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key);
}

/** A length or unitless number as points; null when the value is not numeric. */
function toNumber(value: string): number | null {
  const v = value.trim();
  let m = v.match(/^(-?[\d.]+)rem$/);
  if (m) {
    return round(Number(m[1]) * REM);
  }
  m = v.match(/^(-?[\d.]+)px$/);
  if (m) {
    return round(Number(m[1]));
  }
  m = v.match(/^(-?[\d.]+)ms$/);
  if (m) {
    return round(Number(m[1]));
  }
  m = v.match(/^(-?[\d.]+)s$/);
  if (m) {
    return round(Number(m[1]) * 1000);
  }
  m = v.match(/^(-?[\d.]+)$/);
  if (m) {
    return round(Number(m[1]));
  }
  return null;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function emitTs(mapped: Mapped[], byName: Map<string, string>, sources: SourceHash[]): string {
  const L: string[] = [];
  L.push('/**');
  L.push(' * @fileoverview GENERATED FILE — DO NOT EDIT.');
  L.push(' *');
  L.push(' * Regenerate with:  npm run sync:design');
  L.push(' * Verify with:      npm run sync:design -- --check');
  L.push(' *');
  L.push(' * The design system as typed values, for the places a className cannot reach:');
  L.push(' * react-native-svg props, Reanimated values, imperative styles, and anything');
  L.push(' * measured in JavaScript. Prefer a Uniwind class wherever one exists.');
  L.push(' *');
  L.push(' * Lengths are resolved to points (rem at 16) and durations to milliseconds,');
  L.push(' * because React Native takes numbers where CSS takes units.');
  L.push(' *');
  for (const s of sources) {
    L.push(` * ${s.file.padEnd(18)} sha256 ${s.sha256.slice(0, 16)}`);
  }
  L.push(' */');
  L.push('');

  const used = new Set<string>();

  for (const group of TS_GROUPS) {
    const members = mapped.filter(d => !used.has(d.name) && group.test(d));
    if (!members.length) {
      continue;
    }
    for (const d of members) {
      used.add(d.name);
    }

    L.push('/** ' + group.doc + ' */');
    L.push(`export const ${group.name} = {`);
    for (const d of members) {
      // flatten first so color-mix sees a literal base colour, then substitute.
      const literal = resolveColorMix(flatten(d.value, byName), byName);
      // Numbers wherever the value is a length, a duration or unitless — React
      // Native takes numbers where CSS takes units. Colours, shadows, easing
      // curves and em tracking do not convert and stay strings.
      const numeric = toNumber(literal);
      const rendered = numeric === null ? JSON.stringify(literal) : String(numeric);
      L.push(`  ${keyOf(d.name, group.strip)}: ${rendered},${d.note ? ` // ${d.note}` : ''}`);
    }
    L.push('} as const;');
    L.push('');
  }

  L.push('/**');
  L.push(' * Registered React Native family names, one per bundled (family, weight) face.');
  L.push(' *');
  L.push(' * Every name here is loaded by fonts.generated.ts — the two are emitted from');
  L.push(' * the same table, so a name cannot reference a face the app never registered.');
  L.push(' */');
  L.push('export const fontFamily = {');
  for (const [token, entry] of Object.entries(FAMILIES)) {
    const short = token.replace(/^font-/, '');
    if ('literal' in entry) {
      L.push(`  ${camel(short)}: ${JSON.stringify(entry.literal)},`);
      continue;
    }
    if ('alias' in entry) {
      continue;
    }
    for (const weight of entry.faces) {
      const family = resolveFamily(token, weight);
      if (family) {
        L.push(`  ${camel(`${short}-${weightWord(weight)}`)}: ${JSON.stringify(family)},`);
      }
    }
    for (const weight of entry.italics ?? []) {
      const family = resolveFamily(token, weight, true);
      if (family) {
        L.push(`  ${camel(`${short}-${weightWord(weight)}-italic`)}: ${JSON.stringify(family)},`);
      }
    }
  }
  L.push('} as const;');
  L.push('');

  return L.join('\n');
}

/**
 * The `useFonts` manifest, emitted from the same FAMILIES table as the tokens.
 *
 * Kept apart from tokens.generated.ts on purpose: this module imports TTF assets
 * through Metro, so it can only load inside the app. tokens.generated.ts stays
 * pure data and remains importable from a plain Vitest run.
 */
function emitFonts(sources: SourceHash[]): string {
  const faces = bundledFaces();
  const byPackage = new Map<string, string[]>();
  for (const f of faces) {
    byPackage.set(f.package, [...(byPackage.get(f.package) ?? []), f.importName]);
  }

  const L: string[] = [];
  L.push('/**');
  L.push(' * @fileoverview GENERATED FILE — DO NOT EDIT.');
  L.push(' *');
  L.push(' * Regenerate with:  npm run sync:design');
  L.push(' *');
  L.push(' * Every face the design system needs, ready for `useFonts`. React Native');
  L.push(' * registers one family per weight and synthesises none, so a missing face is a');
  L.push(' * silent fallback to a system font rather than a visible error.');
  L.push(' *');
  L.push(' * Noto Serif Tibetan is 724 KB per face, so only the weights the system asks');
  L.push(' * for are bundled. Widen `faces` in scripts/token-map.ts to add one.');
  L.push(' *');
  for (const s of sources.filter(s => s.file === 'fonts.css')) {
    L.push(` * ${s.file} sha256 ${s.sha256.slice(0, 16)}`);
  }
  L.push(' */');
  L.push('');
  for (const [pkg, names] of byPackage) {
    L.push(`import {\n${names.map(n => `  ${n},`).join('\n')}\n} from ${JSON.stringify(pkg)};`);
  }
  L.push('');
  L.push('/** Pass straight to `useFonts` from expo-font. */');
  L.push('export const fonts = {');
  for (const name of faces.map(f => f.importName)) {
    L.push(`  ${name},`);
  }
  L.push('};');
  L.push('');
  return L.join('\n');
}

// ── main ────────────────────────────────────────────────────────────────────

const changed: string[] = [];

function writeIfChanged(file: string, contents: string) {
  const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (existing === contents) {
    return;
  }
  changed.push(file);
  if (!CHECK) {
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, contents);
  }
}

function main() {
  const tokensDir = findTokensDir();

  const sources: SourceHash[] = [];
  const decls: Decl[] = [];

  fs.mkdirSync(VENDOR_DIR, {recursive: true});

  for (const file of [...TOKEN_FILES, 'base.css']) {
    const src = path.join(tokensDir, file);
    if (!fs.existsSync(src)) {
      fail(`missing token file: ${src}`);
    }
    const css = fs.readFileSync(src, 'utf8');

    sources.push({
      file,
      sha256: createHash('sha256').update(css).digest('hex'),
      bytes: css.length,
    });

    // Vendored verbatim: a true mirror is what makes an upstream change a
    // readable diff. Filtering happens at generation, not here.
    writeIfChanged(path.join(VENDOR_DIR, file), css);

    if (file !== 'base.css') {
      decls.push(...parseTokens(css, file));
    }
  }

  const byName = new Map(decls.map(d => [d.name, d.value]));
  const {mapped, dropped} = mapTokens(decls);

  writeIfChanged(OUT_CSS, emitCss(mapped, dropped, sources, byName));
  writeIfChanged(OUT_TS, emitTs(mapped, byName, sources));
  writeIfChanged(OUT_FONTS, emitFonts(sources));
  writeIfChanged(
    OUT_LOCK,
    JSON.stringify(
      {
        $comment: 'GENERATED by scripts/sync-design.ts — do not edit.',
        source: path.relative(REPO, tokensDir),
        tokens: {parsed: decls.length, emitted: mapped.length, dropped: dropped.length},
        files: sources,
      },
      null,
      2,
    ) + '\n',
  );

  if (CHECK) {
    if (changed.length) {
      console.error(
        `sync-design: out of date — ${changed.length} file(s) would change:\n` +
          changed.map(f => `  ${path.relative(REPO, f)}`).join('\n') +
          `\nRun: npm run sync:design`,
      );
      process.exit(1);
    }
    console.log(`sync-design: up to date (${mapped.length} tokens, ${dropped.length} dropped)`);
    return;
  }

  console.log(
    `sync-design: ${decls.length} tokens read from ${path.relative(REPO, tokensDir)}\n` +
      `             ${mapped.filter(m => m.kind === 'theme').length} into @theme, ` +
      `${mapped.filter(m => m.kind === 'passthru').length} passthrough, ` +
      `${mapped.filter(m => m.kind === 'compose').length} composed, ` +
      `${dropped.length} dropped\n` +
      (changed.length
        ? `             updated:\n${changed.map(f => `               ${path.relative(REPO, f)}`).join('\n')}`
        : `             no changes`),
  );
}

main();
