/**
 * @fileoverview Every test states its phases — `docs/11-testing-conventions.md` §1.
 *
 * A sibling of `check-adherence.ts` rather than a rule inside it, for one structural
 * reason: that script walks **lines** (`Rule.test: (line, file) => string | null`) and
 * excludes test files from the walk entirely. This rule is about a **block** — whether an
 * `it()` body carries its markers, in order — which a line walker cannot express.
 *
 * What it does not do is judge the prose. The convention is that markers are bare, and a
 * marker carrying an explanation is caught here too, because that mistake was made once
 * already and reverted: the explanation belongs in the test's name.
 *
 * Blocks are found by brace matching from `it(`. That is enough because every file is
 * prettier-formatted, and a file that is not fails `format:check` before reaching here.
 *
 * Usage:  node scripts/check-test-shape.ts
 */

import fs from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');

/** Where tests live: colocated under src/, plus the two cross-module trees. */
const ROOTS = ['src', 'tests', 'scripts'];

type Problem = {file: string; line: number; name: string; why: string};

/** `it('...')` or `it("...")`, and the same for `test(`. Not `it.each`, which is a table. */
const OPENS = /^(\s*)(?:it|test)\((['"`])(.*?)\2/;

/** A phase marker, with anything that follows it captured so prose can be reported. */
const MARKER = /^\s*\/\/\s*(Given|When|Then)\b(.*)$/;

const ALLOW = /\/\/\s*test-shape-allow:/;

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        continue;
      }
      yield* walk(full);
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      yield full;
    }
  }
}

/**
 * The lines of one `it()` body, found by matching the closing brace at the opening indent.
 *
 * Returns the body only — never the `it(` line itself and never the closer — so a marker
 * belonging to an enclosing block cannot be counted as this one's.
 */
function body(lines: string[], start: number, indent: string): string[] {
  const closer = `${indent}});`;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i] === closer || lines[i] === `${indent}})`) {
      return lines.slice(start + 1, i);
    }
  }
  return lines.slice(start + 1);
}

/**
 * Whether a block's markers read `Given? (When? Then)+`.
 *
 * The repeat is what lets an A/B test keep its shape: render one variant, assert, render
 * the other, assert. Five tests do that — `WordRow` on `status`, `AnswerChoice` on
 * `state`, `AnswerBand` on `tone` — and each is genuinely one behaviour, stated as a
 * contrast. Splitting them into pairs would say less, not more.
 *
 * @example isWellOrdered(['Given', 'When', 'Then'])                  // true
 * @example isWellOrdered(['When', 'Then', 'When', 'Then'])           // true — an A/B test
 * @example isWellOrdered(['Then', 'When'])                           // false
 * @example isWellOrdered(['Given', 'Then', 'Given'])                 // false
 */
function isWellOrdered(phases: string[]): boolean {
  let i = 0;
  if (phases[0] === 'Given') {
    i = 1;
  }
  let cycles = 0;
  while (i < phases.length) {
    if (phases[i] === 'When') {
      i += 1;
    }
    if (phases[i] !== 'Then') {
      return false;
    }
    i += 1;
    cycles += 1;
  }
  return cycles > 0;
}

const problems: Problem[] = [];
let blocks = 0;
let files = 0;

for (const root of ROOTS) {
  const dir = path.join(REPO, root);
  if (!fs.existsSync(dir)) {
    continue;
  }
  for (const file of walk(dir)) {
    const rel = path.relative(REPO, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    files += 1;

    lines.forEach((line, index) => {
      const open = OPENS.exec(line);
      if (!open) {
        return;
      }
      blocks += 1;

      // An exception is honoured on the `it(` line or in the two above it, matching
      // check-adherence's lookback.
      const context = [lines[index - 2] ?? '', lines[index - 1] ?? '', line].join('\n');
      if (ALLOW.test(context)) {
        return;
      }

      const [indent = '', , name = ''] = [open[1], open[2], open[3]];
      const found: {phase: string; prose: string; at: number}[] = [];
      body(lines, index, indent).forEach((text, offset) => {
        const marker = MARKER.exec(text);
        if (marker) {
          found.push({
            phase: marker[1] as string,
            prose: (marker[2] ?? '').trim(),
            at: index + offset + 2,
          });
        }
      });

      const report = (why: string, at = index + 1) =>
        problems.push({file: rel, line: at, name, why});

      const phases = found.map(f => f.phase);

      if (!phases.includes('Then')) {
        report('no // Then — every test states what it asserts');
        return;
      }

      if (!isWellOrdered(phases)) {
        report(`phases out of order: ${phases.join(' -> ')}`);
      }

      for (const {phase, prose, at} of found) {
        // An em-dash note is the documented way to attach a reason to a phase; a bare
        // trailing sentence is the mistake this rule exists to stop.
        if (prose && !prose.startsWith('—')) {
          report(`prose on the // ${phase} marker — the test name carries the meaning`, at);
        }
      }
    });
  }
}

if (problems.length === 0) {
  console.log(`check-test-shape: clean — ${blocks} test blocks in ${files} files`);
  process.exit(0);
}

console.error(`check-test-shape: ${problems.length} problem(s) in ${files} files\n`);
for (const p of problems) {
  console.error(`  ${p.file}:${p.line}  ${p.name}`);
  console.error(`      ${p.why}\n`);
}
console.error(
  'See docs/11-testing-conventions.md §1, or suspend one in place:\n' +
    '  // test-shape-allow: why this test genuinely has no phases',
);
process.exit(1);
