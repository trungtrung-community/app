/**
 * @fileoverview sync-cards — mirror the design system's component roster.
 *
 *   node scripts/sync-cards.ts            regenerate
 *   node scripts/sync-cards.ts --check    fail if regenerating would change anything
 *
 * The specimen gallery's index is derived from `_ds_manifest.json`, not hand-written.
 * The design system is the authority on which components exist, what they are called
 * and which group they belong to — "IDs are the contract" — so a hand-kept list would
 * quietly disagree the moment the board changed.
 *
 * It also records which components ship a `.card.html` specimen. 23 of the 51 do; the
 * rest have no drawn states to port a gallery entry from, which is worth knowing
 * before writing one rather than after.
 */

import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(REPO, 'src', 'components', 'ds-roster.generated.ts');
const OUT_LOCK = path.join(REPO, 'src', 'components', 'ds-roster.lock.json');

const CHECK = process.argv.includes('--check');

type ManifestComponent = {name: string; sourcePath: string};
type Manifest = {components: ManifestComponent[]; cards?: {path?: string}[]};

function fail(message: string): never {
  console.error(`sync-cards: ${message}`);
  process.exit(1);
}

/** The design-system export, located by structure — its directory is a UUID. */
function findExport(): string {
  const dsRoot = process.env.TRUNGTRUNG_DS_PATH ?? path.resolve(REPO, '..', 'design-system');
  const exportRoot = path.join(dsRoot, 'Trungtrung app - all screens', '_ds');
  if (!fs.existsSync(exportRoot)) {
    fail(`Design system not found at ${exportRoot}. Set TRUNGTRUNG_DS_PATH.`);
  }
  const found = fs
    .readdirSync(exportRoot, {withFileTypes: true})
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(exportRoot, entry.name))
    .find(dir => fs.existsSync(path.join(dir, '_ds_manifest.json')));
  if (!found) {
    fail(`No */_ds_manifest.json under ${exportRoot}`);
  }
  return found;
}

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
  const exportDir = findExport();
  const manifestPath = path.join(exportDir, '_ds_manifest.json');
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw) as Manifest;

  const entries = manifest.components
    .map(component => {
      const group = component.sourcePath.split('/')[1] ?? 'other';
      const specimen = component.sourcePath.replace(/\.jsx$/, '.card.html');
      return {
        name: component.name,
        group,
        hasSource: fs.existsSync(path.join(exportDir, component.sourcePath)),
        hasSpecimen: fs.existsSync(path.join(exportDir, specimen)),
      };
    })
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

  const byGroup = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.group] = (acc[entry.group] ?? 0) + 1;
    return acc;
  }, {});

  const L: string[] = [];
  L.push('/**');
  L.push(' * @fileoverview GENERATED FILE — DO NOT EDIT.');
  L.push(' *');
  L.push(' * Regenerate with:  npm run sync:cards');
  L.push(' * Verify with:      npm run sync:cards -- --check');
  L.push(' *');
  L.push(" * The design system's component roster. The specimen gallery derives its index");
  L.push(' * from this rather than a hand-kept list, because the board is the authority on');
  L.push(' * which components exist and what they are called.');
  L.push(' *');
  L.push(
    ` * ${entries.length} components: ` +
      Object.entries(byGroup)
        .map(([g, n]) => `${n} ${g}`)
        .join(', '),
  );
  L.push(` * ${entries.filter(e => e.hasSource).length} ship .jsx source; the rest exist only as`);
  L.push(' * compiled code in _ds_bundle.js and are ported by reading that.');
  L.push(` * ${entries.filter(e => e.hasSpecimen).length} ship a .card.html specimen.`);
  L.push(' */');
  L.push('');
  L.push(
    'export type DsGroup = ' +
      [...new Set(entries.map(e => e.group))].map(g => `'${g}'`).join(' | ') +
      ';',
  );
  L.push('');
  L.push('export type DsComponent = {');
  L.push('  readonly name: string;');
  L.push('  readonly group: DsGroup;');
  L.push('  /** False when the export ships only compiled bundle code for it. */');
  L.push('  readonly hasSource: boolean;');
  L.push('  /** False when there is no drawn specimen to mirror in the gallery. */');
  L.push('  readonly hasSpecimen: boolean;');
  L.push('};');
  L.push('');
  L.push('export const DS_ROSTER: readonly DsComponent[] = [');
  for (const entry of entries) {
    L.push(
      `  {name: '${entry.name}', group: '${entry.group}', ` +
        `hasSource: ${entry.hasSource}, hasSpecimen: ${entry.hasSpecimen}},`,
    );
  }
  L.push('];');
  L.push('');

  writeIfChanged(OUT, L.join('\n'));
  writeIfChanged(
    OUT_LOCK,
    JSON.stringify(
      {
        $comment: 'GENERATED by scripts/sync-cards.ts — do not edit.',
        source: path.relative(REPO, manifestPath),
        sha256: createHash('sha256').update(raw).digest('hex'),
        components: entries.length,
        byGroup,
        withSource: entries.filter(e => e.hasSource).length,
        withSpecimen: entries.filter(e => e.hasSpecimen).length,
      },
      null,
      2,
    ) + '\n',
  );

  if (CHECK) {
    if (changed.length) {
      fail(
        `out of date — ${changed.length} file(s) would change:\n` +
          changed.map(f => `  ${path.relative(REPO, f)}`).join('\n') +
          `\nRun: npm run sync:cards`,
      );
    }
    console.log(`sync-cards: up to date (${entries.length} components)`);
    return;
  }

  console.log(
    `sync-cards: ${entries.length} components — ` +
      Object.entries(byGroup)
        .map(([g, n]) => `${n} ${g}`)
        .join(', ') +
      `\n            ${entries.filter(e => e.hasSource).length} with source, ` +
      `${entries.filter(e => e.hasSpecimen).length} with a specimen` +
      (changed.length
        ? `\n            updated ${changed.length} file(s)`
        : `\n            no changes`),
  );
}

main();
