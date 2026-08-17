/**
 * @fileoverview check-adherence — the never-do list, enforced.
 *
 *   node scripts/check-adherence.ts
 *
 * The design system ships `_adherence.oxlintrc.json`, a lint contract written before any
 * code was. Ported here, with the rules React Native needs and the website did not.
 *
 * **Every rule in the design system's own contract is severity `warn`, so nothing can fail
 * it.** That is the gap this file exists to close: a gate that cannot fail teaches everyone
 * to ignore it. Here a violation is an error and `npm run validate` stops.
 *
 * Five of these rules are not in the design system's contract and not in the website's copy.
 * They are React Native's, and each one is here because it cost a real bug in this port:
 *
 * - `accessibility-state` — `accessibilityState` never reaches the DOM on react-native-web,
 *   so a TabBar announced four tabs and no current one, silently. `aria-*` maps both ways.
 * - `dynamic-class` — Uniwind generates classes at build time from literal strings. A
 *   computed class name is a class that was never generated, and it fails as *nothing*.
 * - `flex-zero` — `flex: 0` resolves to `flex-basis: 0%`, which outranks `width` on a flex
 *   item. It produced a 26pt checkbox that rendered at zero and typechecked. `flexShrink: 0`
 *   is the spelling that means what it says.
 * - `pointer-events-prop` — deprecated as a prop; it belongs in the style object.
 * - `tibetan-outside-tibetantext` — `docs/04`: nothing but `TibetanText` sets a Tibetan face
 *   or marks the language. The design system's own source broke this in 83 mounts before it
 *   was caught, which is why it is a gate and not a convention.
 *
 * An exception needs a reason, in place, naming the rule it suspends:
 *
 *   tibetan // adherence-allow: tibetan-outside-tibetantext — a field being typed into
 */

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Walked. Generated and vendored files hold raw values by design and are not scanned. */
const ROOTS = ['app', 'src', 'scripts'];
const SKIP = new Set([
  path.join('src', 'theme', 'tokens'),
  path.join('src', 'theme', 'tokens.generated.ts'),
  path.join('src', 'theme', 'theme.generated.css'),
  path.join('src', 'components', 'ds-roster.generated.ts'),
  path.join('src', 'infra', 'content', 'rows.generated.ts'),
  path.join('scripts', 'check-adherence.ts'),
]);

/** The one file allowed to set a Tibetan face and mark the language. */
const TIBETAN_TEXT = path.join('src', 'components', 'learning', 'tibetan-text.tsx');

type Rule = {
  id: string;
  why: string;
  /** The offending text on this line, or null. */
  test: (line: string, file: string) => string | null;
};

/**
 * Pictographic emoji and dingbats.
 *
 * Tibetan is U+0F00–U+0FFF and must never be caught here — the ranges below start far
 * above it, which is the whole reason they are written out rather than approximated.
 */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{2B00}-\u{2BFF}]/u;

/**
 * A doc-comment line — `*`, `/*` or `*\/`-prefixed.
 *
 * Rules describe what the code does; prose about what it does is not a violation of it.
 * Without this, every rule fires on the paragraph explaining why the rule exists — which
 * is exactly what happened the first time this ran.
 */
function isDocLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith('*') || trimmed.startsWith('/*');
}

/**
 * The line with any trailing `//` comment removed.
 *
 * Quote-aware, so a `//` inside a string literal survives — otherwise a URL would take
 * half the line with it.
 */
function stripComment(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (quote) {
      if (char === '\\') {
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'" || char === '`') {
      quote = char;
    } else if (char === '/' && line[i + 1] === '/') {
      return line.slice(0, i);
    }
  }
  return line;
}

/**
 * The line with every string literal blanked out, keeping the quotes.
 *
 * For the rules that look at JSX shape rather than at words. Without it, a specimen note
 * *describing* a `lang="bo"` span reads as one, and a Tibetan string passed as a prop reads
 * as bare script in a text position.
 */
function withoutLiterals(line: string): string {
  return line.replace(
    /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/g,
    match => match[0] + ' '.repeat(Math.max(match.length - 2, 0)) + match[0],
  );
}

/** String literal contents on a line, so prose rules do not fire on code. */
function literals(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(line))) {
    out.push(match[1] ?? match[2] ?? match[3] ?? '');
  }
  return out;
}

/**
 * The specimen gallery, which is dev-only and behind `__DEV__`.
 *
 * Its prose describes the components to whoever is building them. "A locked node is the
 * same button greyed" is a sentence about a state name, not a thing anyone is told.
 */
const GALLERY = [path.join('src', 'components', 'specimens.tsx'), path.join('app', '_ds')];

/** True for a file whose strings are product copy a learner can read. */
function isCopy(file: string): boolean {
  if (GALLERY.some(entry => file.startsWith(entry))) {
    return false;
  }
  return file.startsWith('src' + path.sep) || file.startsWith('app' + path.sep);
}

const RULES: Rule[] = [
  {
    id: 'raw-hex',
    why: 'every colour comes from a token; if a value has no token, add the token',
    test: line => line.match(/#[0-9a-fA-F]{3,8}\b/)?.[0] ?? null,
  },
  {
    id: 'hairline-border',
    why: 'the system separates surfaces by fill value; `1px solid` appears nowhere in it',
    test: line => {
      // An outline sits outside the box and separates nothing, so it is not this rule's
      // business — and the focus ring is mandated as one.
      if (/\boutline\b/.test(line)) {
        return null;
      }
      return line.match(/\bborder[\w-]*\s*:\s*[^;,]*?\d+px\s+solid\b/)?.[0] ?? null;
    },
  },
  {
    id: 'literal-shadow',
    why: 'shadows come from --shadow-* / --edge-* / --ring-* tokens, never a hand-written colour',
    test: line => {
      if (!/box-shadow|boxShadow/.test(line)) {
        return null;
      }
      return line.match(/(?:box-shadow|boxShadow)[^;]*?(?:#[0-9a-fA-F]{3,8}|rgba?\()/)?.[0] ?? null;
    },
  },
  {
    id: 'board-token',
    why: '--board-* are documentation surfaces and are never product UI',
    test: line => line.match(/--board-[\w-]+/)?.[0] ?? null,
  },
  {
    id: 'palette-codename',
    why: 'the design system states the palette codename is never user-facing text',
    test: (line, file) => (isCopy(file) && /High Plateau/.test(line) ? 'High Plateau' : null),
  },
  {
    id: 'emoji',
    why: 'no emoji, ever — the mascot carries all the warmth this product needs',
    test: line => line.match(EMOJI)?.[0] ?? null,
  },
  {
    id: 'exclamation',
    why: 'at most one exclamation mark in the whole product, and S9 owns it',
    test: (line, file) => {
      if (!isCopy(file)) {
        return null;
      }
      for (const text of literals(line)) {
        if (text.includes('!')) {
          return text.slice(0, 60);
        }
      }
      return null;
    },
  },
  {
    id: 'loss-framing',
    why: 'no guilt or loss framing anywhere, including notifications',
    test: (line, file) => {
      if (!isCopy(file)) {
        return null;
      }
      const banned =
        /\b(don't lose|lose your|streak freeze|streak lost|you failed|keep missing|last chance|hurry|locked)\b/i;
      for (const text of literals(line)) {
        // Copy is phrases. A bare lowercase token is an identifier — RailNode's `locked`
        // state is an API name, and the map it draws never says the word to anyone.
        // A capitalised standalone word is a label, so that still counts.
        const isPhrase = text.includes(' ');
        const isLabel = /^[A-Z]/.test(text);
        if (!isPhrase && !isLabel) {
          continue;
        }
        const hit = text.match(banned);
        if (hit) {
          return hit[0];
        }
      }
      return null;
    },
  },
  {
    id: 'tibetan-outside-tibetantext',
    why: 'docs/04: only TibetanText sets a Tibetan face, marks the language or renders bare script',
    test: (line, file) => {
      if (file === TIBETAN_TEXT) {
        return null;
      }
      const family = line.match(/fontFamily\.tibetan\w*/)?.[0];
      if (family) {
        return family;
      }
      // JSX shape, so the rules read markup rather than the prose about it.
      const markup = withoutLiterals(line);
      if (/accessibilityLanguage/.test(markup) || /\slang=/.test(markup)) {
        return 'the language mark';
      }
      // Tibetan sitting in a JSX text position — `<Text>ཀ</Text>`. Script inside a string
      // is a prop or a specimen, which is how content is supposed to travel.
      const jsxText = markup.match(/>[^<>{}]*[ༀ-࿿][^<>{}]*</)?.[0];
      return jsxText ? jsxText.trim().slice(0, 40) : null;
    },
  },
  {
    id: 'accessibility-state',
    why: 'accessibilityState never reaches the DOM on react-native-web; aria-* maps both ways',
    test: line => (/accessibilityState\s*=/.test(line) ? 'accessibilityState' : null),
  },
  {
    id: 'dynamic-class',
    why: 'Uniwind generates classes from literal strings; a name built from a fragment renders as nothing',
    test: line => {
      // A whole class chosen by a ternary is fine — both branches are literals the
      // scanner finds. What cannot work is a class *assembled* from parts, where no
      // complete name appears in the source: `bg-${tone}-600`, or the `.replace()` that
      // turned a text- class into a bg- one and rendered as nothing at all.
      const inToken = line.match(/className=\{`[^`]*(?:[\w-]\$\{|\}[\w-])/)?.[0];
      if (inToken) {
        return inToken.slice(-40);
      }
      const surgery = line.match(/className=\{[^}]*\.(?:replace|concat|slice|split)\(/)?.[0];
      return surgery ? surgery.slice(0, 40) : null;
    },
  },
  {
    id: 'flex-zero',
    why: '`flex: 0` is `flex-basis: 0%` and outranks width; say flexShrink: 0',
    test: line => (/\bflex:\s*0\b/.test(line) ? 'flex: 0' : null),
  },
  {
    id: 'pointer-events-prop',
    why: 'pointerEvents is deprecated as a prop and warns every render; it is a style',
    test: line => (/\spointerEvents=/.test(line) ? 'pointerEvents=' : null),
  },
];

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(REPO, full);
    if (SKIP.has(rel)) {
      continue;
    }
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (/\.(ts|tsx|css)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      // Tests are not the product. They render TibetanText itself, assert on colours and
      // reproduce the very shapes these rules forbid, on purpose — and nothing in them is
      // ever seen by a learner.
      yield full;
    }
  }
}

type Finding = {file: string; line: number; rule: Rule; text: string};

const findings: Finding[] = [];
let scanned = 0;

for (const root of ROOTS) {
  const dir = path.join(REPO, root);
  if (!fs.existsSync(dir)) {
    continue;
  }
  for (const file of walk(dir)) {
    const rel = path.relative(REPO, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    scanned += 1;

    lines.forEach((line, index) => {
      if (isDocLine(line)) {
        return;
      }
      const code = stripComment(line);
      // An exception is honoured on its own line or in the two above it — enough room for
      // a reason that does not fit on one — and it has to name the rule it suspends, so a
      // blanket "ignore" cannot be written.
      const context = [lines[index - 2] ?? '', lines[index - 1] ?? '', line].join('\n');
      for (const rule of RULES) {
        if (context.includes(`adherence-allow: ${rule.id}`)) {
          continue;
        }
        const hit = rule.test(code, rel);
        if (hit) {
          findings.push({file: rel, line: index + 1, rule, text: hit.trim()});
        }
      }
    });
  }
}

if (findings.length === 0) {
  console.log(
    `check-adherence: clean — ${scanned} files, ${RULES.length} rules from docs/01, docs/04 and the port`,
  );
  process.exit(0);
}

const byRule = new Map<string, Finding[]>();
for (const finding of findings) {
  byRule.set(finding.rule.id, [...(byRule.get(finding.rule.id) ?? []), finding]);
}

console.error(`check-adherence: ${findings.length} violation(s) across ${scanned} files\n`);
for (const [id, group] of byRule) {
  console.error(`  ${id} — ${group[0]!.rule.why}`);
  for (const finding of group) {
    console.error(`      ${finding.file}:${finding.line}  ${finding.text}`);
  }
  console.error('');
}
console.error(
  'Fix these, or suspend one in place with a comment naming the rule:\n' +
    '  // adherence-allow: <rule-id> — why this case is genuinely different',
);
process.exit(1);
