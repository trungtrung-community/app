/**
 * @fileoverview The design-system -> Tailwind v4 / React Native namespace map.
 *
 * This is the ONE file to edit when the design system grows a new token family.
 * `scripts/sync-design.ts` reads these rules; nothing else hard-codes a token name.
 *
 * Rules are scoped by source file and evaluated in order — first match wins.
 * File scoping is not decoration: `--rail-node-done` is a colour in colors.css
 * while `--rail-node` is a length in spacing.css, so name alone cannot decide.
 *
 * Ported from `website/scripts/token-map.ts`. The web and native maps agree
 * wherever they can; every deliberate divergence is a comment saying why.
 */

/** What a rule does with a token. */
export type Target =
  /** Rename into a Tailwind namespace. Return the name WITHOUT the leading `--`. */
  | ((name: string, m: RegExpMatchArray) => string)
  /** Never ships. */
  | 'drop'
  /** Keep the design-system name, emit into `:root`, generate no utility. */
  | 'passthru'
  /** A CSS `font` shorthand role; becomes an `@utility`. */
  | 'compose';

export type TokenRule = {
  /** Basename of the source token file, e.g. "colors.css". */
  file: string;
  /** Matched against the token name WITHOUT the leading `--`. */
  match: RegExp;
  to: Target;
  /** Why this rule exists. Emitted into the generated file as documentation. */
  why?: string;
};

export const RULES: TokenRule[] = [
  // ── colors.css ────────────────────────────────────────────────────────────
  {
    file: 'colors.css',
    match: /^board-/,
    to: 'drop',
    why: 'documentation surfaces — the design system marks these board/specimen chrome, never product UI',
  },
  {
    file: 'colors.css',
    match: /^text-(.+)$/,
    to: (_n, m) => `color-fg-${m[1]}`,
    why: 'renamed: Tailwind v4 reserves the --text-* namespace for font sizes, and typography.css already owns it',
  },
  {file: 'colors.css', match: /^.+$/, to: n => `color-${n}`},

  // ── fonts.css ─────────────────────────────────────────────────────────────
  {
    file: 'fonts.css',
    match: /^font-/,
    to: n => n,
    why: 'the CSS stack collapses to one bundled family — React Native selects a single face with no fallback',
  },

  // ── typography.css ────────────────────────────────────────────────────────
  {
    file: 'typography.css',
    match: /^type-/,
    to: 'compose',
    why: 'composed `weight size / leading family` roles — Tailwind has no equivalent namespace, so these become @utility rules',
  },
  {file: 'typography.css', match: /^text-/, to: n => n},
  {
    file: 'typography.css',
    match: /^weight-(.+)$/,
    to: (_n, m) => `font-weight-${m[1]}`,
    why: 'emitted for reference only — React Native ignores fontWeight on a bundled family (Phase 0 spike, finding 3)',
  },
  {file: 'typography.css', match: /^leading-/, to: n => n},
  {file: 'typography.css', match: /^tracking-/, to: n => n},

  // ── spacing.css ───────────────────────────────────────────────────────────
  {file: 'spacing.css', match: /^space-(.+)$/, to: (_n, m) => `spacing-${m[1]}`},
  {
    file: 'spacing.css',
    match: /^measure-(.+)$/,
    to: (_n, m) => `container-${m[1]}`,
    why: "measures are max-widths; Tailwind's --container-* namespace generates max-w-* for them",
  },
  {
    file: 'spacing.css',
    match: /^.+$/,
    to: 'passthru',
    why: 'layout constants (gutters, bar heights, rail geometry) — used via var() or the typed token module',
  },

  // ── radius.css ────────────────────────────────────────────────────────────
  {file: 'radius.css', match: /^radius-/, to: n => n},

  // ── elevation.css ─────────────────────────────────────────────────────────
  {file: 'elevation.css', match: /^shadow-/, to: n => n},
  {
    file: 'elevation.css',
    match: /^edge-depth/,
    to: 'passthru',
    why: '--edge-depth / --edge-depth-pressed are lengths, not shadows — must be matched before the --edge-* shadow rule',
  },
  {
    file: 'elevation.css',
    match: /^edge-(.+)$/,
    to: (_n, m) => `shadow-edge-${m[1]}`,
    why: 'the signature keycap button edge is a box-shadow, which React Native supports on the new architecture (Phase 0 spike, finding 6)',
  },
  {
    file: 'elevation.css',
    match: /^ring-(.+)$/,
    to: (_n, m) => `shadow-ring-${m[1]}`,
    why: 'the inset rings are box-shadows too — the system draws outlines with inset shadow, never a 1px border',
  },
  {
    file: 'elevation.css',
    match: /^.+$/,
    to: 'passthru',
    why: '--border-none, --divider-hairline, --outline-mascot are bare lengths',
  },

  // ── motion.css ────────────────────────────────────────────────────────────
  {file: 'motion.css', match: /^ease-/, to: n => n},
  {
    file: 'motion.css',
    match: /^.+$/,
    to: 'passthru',
    why: 'Tailwind v4 has no --duration-* theme namespace; durations and press constants are read from the typed token module by Reanimated',
  },
];

/**
 * Token files pulled from the design system, in `@import` order.
 * `base.css` is global CSS rather than tokens and is vendored but not parsed.
 */
export const TOKEN_FILES = [
  'fonts.css',
  'colors.css',
  'typography.css',
  'spacing.css',
  'radius.css',
  'elevation.css',
  'motion.css',
] as const;

/**
 * The bundled faces behind each design-system font token.
 *
 * This table is the single source of truth for both the emitted family tokens and
 * the `useFonts` manifest, so a token can never name a face the app did not load.
 *
 * React Native selects exactly one family and synthesises nothing, so the CSS
 * stacks in fonts.css cannot survive, and every weight is its own family.
 *
 * `faces` is deliberately narrow. Noto Serif Tibetan is **724 KB per face** —
 * ten times the Latin fonts — so it ships only the two weights the system asks
 * for: `TibetanText` hardcodes `--weight-regular`, and `--type-tibetan-hero` is
 * the sole medium. Asking for an unbundled weight is a build warning, never a
 * silent substitution.
 *
 * `--font-tibetan` names "Noto Sans Tibetan" first, which Google Fonts does not
 * publish, so both Tibetan tokens alias the serif face — which is what the board
 * has always rendered.
 *
 * `--font-mono` has no bundled face. It carries the Wylie row, which is off by
 * default, so it resolves to a platform name rather than earning 96 KB in the
 * bundle. Menlo exists on iOS and web but not Android, where it falls back to the
 * default sans. Revisit when the Read track actually draws Wylie.
 */
export type FamilyEntry =
  | {base: string; package: string; faces: number[]; italics?: number[]; default: number}
  | {alias: string}
  | {literal: string};

export const FAMILIES: Record<string, FamilyEntry> = {
  'font-display': {
    base: 'Gabarito',
    package: '@expo-google-fonts/gabarito',
    faces: [700, 800],
    default: 700,
  },
  'font-body': {
    base: 'PlusJakartaSans',
    package: '@expo-google-fonts/plus-jakarta-sans',
    faces: [400, 500, 600, 700],
    // 22 uses of `italic var(--weight-medium)` and 2 of `italic var(--weight-bold)`
    // across the design system — the romanization line under Tibetan is the main one.
    italics: [500, 700],
    default: 400,
  },
  'font-tibetan': {
    base: 'NotoSerifTibetan',
    package: '@expo-google-fonts/noto-serif-tibetan',
    faces: [400, 500],
    default: 400,
  },
  'font-tibetan-serif': {alias: 'font-tibetan'},
  'font-mono': {literal: 'Menlo'},
};

/**
 * The `@expo-google-fonts` filename suffix for each CSS weight. A registered
 * family name is `${base}_${WEIGHT_SUFFIX[weight]}`.
 */
export const WEIGHT_SUFFIX: Record<number, string> = {
  100: '100Thin',
  200: '200ExtraLight',
  300: '300Light',
  400: '400Regular',
  500: '500Medium',
  600: '600SemiBold',
  700: '700Bold',
  800: '800ExtraBold',
  900: '900Black',
};

/**
 * Design-system weight tokens, resolved to numbers so a composed `--type-*` role
 * can pick the face that IS that weight.
 */
export const WEIGHT_VALUES: Record<string, number> = {
  'weight-regular': 400,
  'weight-medium': 500,
  'weight-semibold': 600,
  'weight-bold': 700,
  'weight-display': 800,
};

/**
 * Strings scrubbed from comments before they are emitted.
 *
 * The design system's readme states the palette codename must never appear as
 * user-facing text, and a comment in a shipped artefact is readable by anyone.
 */
export const SCRUB: Array<[RegExp, string]> = [[/:?\s*High Plateau/g, '']];

/** Resolve a token to its rule. Returns null when no rule matches. */
export function resolve(
  file: string,
  name: string,
): {rule: TokenRule; match: RegExpMatchArray} | null {
  for (const rule of RULES) {
    if (rule.file !== file) {
      continue;
    }
    const m = name.match(rule.match);
    if (m) {
      return {rule, match: m};
    }
  }
  return null;
}

/** Follow `alias` entries to the family that actually declares faces. */
export function realFamily(familyToken: string): {token: string; entry: FamilyEntry} | null {
  let token = familyToken;
  for (let hops = 0; hops < 4; hops++) {
    const entry = FAMILIES[token];
    if (!entry) {
      return null;
    }
    if (!('alias' in entry)) {
      return {token, entry};
    }
    token = entry.alias;
  }
  return null;
}

/**
 * The registered React Native family name for a design-system font token at a
 * given weight.
 *
 * Returns null when the weight is not bundled, so the caller can warn rather than
 * emit a token naming a face the app never loaded.
 *
 * @param familyToken A key of FAMILIES, e.g. "font-body".
 * @param weight A CSS weight number. Omit for the family's default face.
 * @example resolveFamily('font-body', 600) // 'PlusJakartaSans_600SemiBold'
 * @example resolveFamily('font-body', 500, true) // 'PlusJakartaSans_500Medium_Italic'
 */
export function resolveFamily(
  familyToken: string,
  weight?: number,
  italic = false,
): string | null {
  const real = realFamily(familyToken);
  if (!real) {
    return null;
  }
  const {entry} = real;
  if ('literal' in entry) {
    return entry.literal;
  }
  if ('alias' in entry) {
    return null;
  }

  const want = weight ?? entry.default;
  const pool = italic ? (entry.italics ?? []) : entry.faces;
  if (!pool.includes(want)) {
    return null;
  }
  const suffix = WEIGHT_SUFFIX[want];
  if (!suffix) {
    return null;
  }
  return `${entry.base}_${suffix}${italic ? '_Italic' : ''}`;
}

/** Every face the bundle must register, as `{importName, package}`. */
export function bundledFaces(): Array<{importName: string; package: string}> {
  const out: Array<{importName: string; package: string}> = [];
  for (const entry of Object.values(FAMILIES)) {
    if ('alias' in entry || 'literal' in entry) {
      continue;
    }
    for (const weight of entry.faces) {
      const suffix = WEIGHT_SUFFIX[weight];
      if (suffix) {
        out.push({importName: `${entry.base}_${suffix}`, package: entry.package});
      }
    }
    for (const weight of entry.italics ?? []) {
      const suffix = WEIGHT_SUFFIX[weight];
      if (suffix) {
        out.push({importName: `${entry.base}_${suffix}_Italic`, package: entry.package});
      }
    }
  }
  return out;
}

/** The lowercase weight word used in token names, e.g. 600 -> "semibold". */
export function weightWord(weight: number): string {
  return (WEIGHT_SUFFIX[weight] ?? String(weight)).replace(/^\d+/, '').toLowerCase();
}
