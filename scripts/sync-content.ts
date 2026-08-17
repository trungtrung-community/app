/**
 * @fileoverview sync-content — bring in the compiled content artifact.
 *
 *   node scripts/sync-content.ts            copy the artifact in
 *   node scripts/sync-content.ts --check    fail if it is missing or stale
 *
 * The app does NOT build content. `design-system/scripts/build_db.py` compiles the
 * validated JSON to SQLite; this script copies the result in, verifies it against
 * its manifest, and generates the row types the adapters are written against.
 *
 * That generation is what makes the repo split safe. With the schema owned by
 * Python and the mapping owned by TypeScript, a renamed column would otherwise be a
 * runtime surprise on a device. Instead the row types come from the manifest and
 * carry its schema_version, so the adapter fails to compile until it is regenerated
 * — the same pattern as tokens.generated.ts.
 *
 * The database is copied rather than committed: it is a binary that changes wholesale
 * on every content build, and git would keep every version forever. Once content
 * stabilises this becomes a pinned release artifact fetched by digest; there is no
 * point building that plumbing before there is content to release.
 */

import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(REPO, 'src', 'infra', 'content');

const OUT_DB = path.join(REPO, 'assets', 'content.db');
const OUT_FIXTURE = path.join(CONTENT_DIR, 'content.fixture.json');
const OUT_ROWS = path.join(CONTENT_DIR, 'rows.generated.ts');
const OUT_LOCK = path.join(CONTENT_DIR, 'content.lock.json');

const CHECK = process.argv.includes('--check');

/** SQLite storage classes mapped to the TypeScript a row field actually holds. */
const TS_TYPE: Record<string, string> = {
  TEXT: 'string',
  INTEGER: 'number',
  REAL: 'number',
  BLOB: 'ArrayBuffer',
};

type Column = {name: string; type: string; notnull: boolean};
type Manifest = {
  schema_version: number;
  content_version: string;
  tables: Record<string, Column[]>;
  rows: Record<string, number>;
  db_sha256: string;
  db_bytes: number;
};

function fail(message: string): never {
  console.error(`sync-content: ${message}`);
  process.exit(1);
}

function findArtifactDir(): string {
  const dsRoot = process.env.TRUNGTRUNG_DS_PATH ?? path.resolve(REPO, '..', 'design-system');
  const dist = path.join(dsRoot, 'dist');
  if (!fs.existsSync(path.join(dist, 'content.manifest.json'))) {
    fail(
      `No content artifact at ${dist}\n` +
        `Build it first:\n` +
        `  cd ${dsRoot} && .venv/bin/python scripts/build_db.py\n` +
        `Or set TRUNGTRUNG_DS_PATH to the design-system repo root.`,
    );
  }
  return dist;
}

/** A row type per table, named for the table and pinned to the schema version. */
function emitRows(manifest: Manifest): string {
  const L: string[] = [];
  L.push('/**');
  L.push(' * @fileoverview GENERATED FILE — DO NOT EDIT.');
  L.push(' *');
  L.push(' * Regenerate with:  npm run sync:content');
  L.push(' * Verify with:      npm run check:content');
  L.push(' *');
  L.push(' * The shape of each table in the compiled content artifact, generated from');
  L.push(' * its manifest. These are STORAGE types, not domain types: snake_case, and');
  L.push(' * nullable wherever the column is. Map them at the adapter boundary — the');
  L.push(' * engine must never see a database row.');
  L.push(' *');
  L.push(` * schema_version  ${manifest.schema_version}`);
  L.push(` * content_version ${manifest.content_version}`);
  L.push(' */');
  L.push('');
  L.push('/**');
  L.push(' * The schema this file was generated against.');
  L.push(' *');
  L.push(' * The adapter asserts the opened database reports the same number. A content');
  L.push(' * build with a changed schema therefore fails loudly at startup rather than');
  L.push(' * returning undefined for a renamed column.');
  L.push(' */');
  L.push(`export const CONTENT_SCHEMA_VERSION = ${manifest.schema_version};`);
  L.push('');
  L.push('/**');
  L.push(' * The content build this app bundles.');
  L.push(' *');
  L.push(' * expo-sqlite copies a bundled database to the app directory on first launch');
  L.push(' * and does NOT replace it on a later app update. So the adapter compares this');
  L.push(' * against what the copied file reports and re-imports when they differ, which');
  L.push(' * is safe because progress lives in MMKV and never in the content database.');
  L.push(' */');
  L.push(`export const CONTENT_VERSION = ${JSON.stringify(manifest.content_version)};`);
  L.push('');

  for (const [table, columns] of Object.entries(manifest.tables)) {
    const name = table.replace(/(^|_)([a-z])/g, (_, __, c: string) => c.toUpperCase()) + 'Row';
    L.push(`/** ${table} — ${manifest.rows[table] ?? 0} rows in this build. */`);
    L.push(`export type ${name} = {`);
    for (const column of columns) {
      const ts = TS_TYPE[column.type.toUpperCase()] ?? 'unknown';
      L.push(`  ${column.name}: ${column.notnull ? ts : `${ts} | null`};`);
    }
    L.push('};');
    L.push('');
  }

  return L.join('\n');
}

const changed: string[] = [];

function writeIfChanged(file: string, contents: string | Buffer) {
  const existing = fs.existsSync(file) ? fs.readFileSync(file) : null;
  const next = Buffer.isBuffer(contents) ? contents : Buffer.from(contents);
  if (existing && existing.equals(next)) {
    return;
  }
  changed.push(file);
  if (!CHECK) {
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, next);
  }
}

function main() {
  const dist = findArtifactDir();
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dist, 'content.manifest.json'), 'utf8'),
  ) as Manifest;

  const db = fs.readFileSync(path.join(dist, 'content.db'));
  const actual = createHash('sha256').update(db).digest('hex');
  if (actual !== manifest.db_sha256) {
    fail(
      `content.db does not match its manifest.\n` +
        `  manifest ${manifest.db_sha256}\n` +
        `  actual   ${actual}\n` +
        `Rebuild it: .venv/bin/python scripts/build_db.py`,
    );
  }

  writeIfChanged(OUT_DB, db);
  writeIfChanged(OUT_FIXTURE, fs.readFileSync(path.join(dist, 'content.fixture.json')));
  writeIfChanged(OUT_ROWS, emitRows(manifest));
  writeIfChanged(
    OUT_LOCK,
    JSON.stringify(
      {
        $comment: 'GENERATED by scripts/sync-content.ts — do not edit.',
        source: path.relative(REPO, dist),
        schema_version: manifest.schema_version,
        content_version: manifest.content_version,
        db_sha256: manifest.db_sha256,
        db_bytes: manifest.db_bytes,
        rows: manifest.rows,
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
          `\nRun: npm run sync:content`,
      );
    }
    console.log(
      `sync-content: up to date (schema ${manifest.schema_version}, ` +
        `content ${manifest.content_version}, ${manifest.rows.vocabulary} vocabulary rows)`,
    );
    return;
  }

  console.log(
    `sync-content: schema ${manifest.schema_version}, content ${manifest.content_version}\n` +
      `              ${manifest.rows.vocabulary} vocabulary rows, ` +
      `${Math.round(manifest.db_bytes / 1024)} KB\n` +
      (changed.length
        ? `              updated:\n${changed.map(f => `                ${path.relative(REPO, f)}`).join('\n')}`
        : `              no changes`),
  );
}

main();
