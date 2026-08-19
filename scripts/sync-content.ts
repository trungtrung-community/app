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
 * Four kinds of type come out of the manifest, and each closes a different way for
 * a change upstream to reach a device unannounced:
 *
 * - **Row types**, one per table. A renamed column stops compiling.
 * - **Closed columns**, as string-literal unions. A seventeenth exercise type
 *   widens `ExerciseType`, and the mapper's exhaustive switch stops compiling.
 * - **Payload unions**, discriminated on the type or kind that decides the shape.
 *   `payload_json` would otherwise reach the app as `any`, which is exactly where
 *   the guarantee is worth the most.
 * - **The fixture type**, from the committed subset itself. A table the fixture
 *   stops carrying is a table the web adapter stops compiling against, rather than
 *   one that silently answers with nothing.
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

/** JSON types in the order they read best in a union, with `null` last. */
const TYPE_ORDER = ['object', 'array', 'string', 'number', 'boolean', 'null'];

type Column = {name: string; type: string; notnull: boolean};

/**
 * One node of a payload's shape, as `build_db.py` measures it.
 *
 * `type` lists every JSON type the node was seen holding, so a field that is a
 * string on some rows and null on others says so. `fields` is present when the
 * node can be an object, `items` when it can be an array.
 */
type Shape = {
  type: string[];
  fields?: Record<string, Field>;
  items?: Shape;
};

type Field = Shape & {optional: boolean};

/** Every payload shape for one discriminator value, and how many rows carry it. */
type PayloadGroup = {count: number; fields: Record<string, Field>};

type EnumColumn = {values: string[]; nullable: boolean};

type Manifest = {
  schema_version: number;
  content_version: string;
  tables: Record<string, Column[]>;
  rows: Record<string, number>;
  payloads: Record<string, PayloadGroup>;
  position_payloads: Record<string, PayloadGroup>;
  enums: Record<string, EnumColumn>;
  db_sha256: string;
  db_bytes: number;
};

/** The committed subset, as JSON. Only its array-valued keys become row lists. */
type Fixture = Record<string, unknown>;

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

/** `stop_position` -> `StopPosition`, and `read-a-word` -> `ReadAWord`. */
function pascal(name: string): string {
  return name.replace(/(^|[_-])([a-z0-9])/g, (_, __, c: string) => c.toUpperCase());
}

/** The generated name for a closed column, e.g. `exercise.family` -> `ExerciseFamily`. */
function enumName(key: string): string {
  const [table = '', column = ''] = key.split('.');
  return pascal(table) + pascal(column);
}

/** A TypeScript property key, quoted only when it is not a bare identifier. */
function propertyKey(name: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);
}

/**
 * One shape as a TypeScript type.
 *
 * `indent` is the leading whitespace of the line the type starts on, so a nested
 * object closes its brace under its own opening line rather than at column zero.
 *
 * @returns `never` for a node that was never seen holding anything — an array that
 * is always empty has no element type, and saying so is more honest than `unknown`.
 */
function tsType(shape: Shape, indent: string): string {
  const parts = [...shape.type]
    .sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b))
    .map(kind => {
      switch (kind) {
        case 'object':
          return tsObject(shape.fields ?? {}, indent);
        case 'array':
          return tsArray(shape.items, indent);
        case 'string':
          return 'string';
        case 'number':
          return 'number';
        case 'boolean':
          return 'boolean';
        case 'null':
          return 'null';
        default:
          throw new Error(`sync-content: unknown JSON type ${kind} in the manifest`);
      }
    });
  return parts.length === 0 ? 'never' : parts.join(' | ');
}

/** An object literal type, or `Record<string, never>` when it carries no keys. */
function tsObject(fields: Record<string, Field>, indent: string): string {
  const names = Object.keys(fields);
  if (names.length === 0) {
    return 'Record<string, never>';
  }
  const inner = `${indent}  `;
  const lines = names.map(name => {
    const field = fields[name] as Field;
    return `${inner}${propertyKey(name)}${field.optional ? '?' : ''}: ${tsType(field, inner)};`;
  });
  return `{\n${lines.join('\n')}\n${indent}}`;
}

/** A readonly array type, parenthesised when its element type is itself a union. */
function tsArray(items: Shape | undefined, indent: string): string {
  const element = items ? tsType(items, indent) : 'never';
  return /[|&]/.test(element) ? `readonly (${element})[]` : `readonly ${element}[]`;
}

/**
 * One payload union, discriminated on the column that decides the payload's shape.
 *
 * Used twice — `exercise.payload_json` keyed on `type`, and
 * `stop_position.payload_json` keyed on `kind`. Two callers rather than two
 * emitters, because the two payloads differ only in what they are keyed on.
 */
function emitPayloadUnion(
  name: string,
  discriminant: string,
  groups: Record<string, PayloadGroup>,
  doc: string[],
): string[] {
  const lines = ['/**', ...doc.map(line => (line ? ` * ${line}` : ' *')), ' */'];
  lines.push(`export type ${name} =`);
  for (const [key, group] of Object.entries(groups)) {
    const fields: Record<string, Field> = {
      [discriminant]: {type: ['literal'], optional: false},
      ...group.fields,
    };
    const names = Object.keys(fields);
    const body = names
      .map(field => {
        if (field === discriminant) {
          return `      ${discriminant}: ${JSON.stringify(key)};`;
        }
        const shape = fields[field] as Field;
        return `      ${propertyKey(field)}${shape.optional ? '?' : ''}: ${tsType(shape, '      ')};`;
      })
      .join('\n');
    lines.push(`  /** ${group.count} rows in this build. */`);
    lines.push(
      names.length === 1
        ? `  | {${discriminant}: ${JSON.stringify(key)}}`
        : `  | {\n${body}\n    }`,
    );
  }
  lines[lines.length - 1] += ';';
  lines.push('');
  return lines;
}

/** Row types, closed columns, payload unions and the fixture, from the manifest. */
function emitRows(manifest: Manifest, fixture: Fixture): string {
  const L: string[] = [];
  L.push('/**');
  L.push(' * @fileoverview GENERATED FILE — DO NOT EDIT.');
  L.push(' *');
  L.push(' * Regenerate with:  npm run sync:content');
  L.push(' * Verify with:      npm run check:content');
  L.push(' *');
  L.push(' * The shape of the compiled content artifact, generated from its manifest.');
  L.push(' * These are STORAGE types, not domain types: snake_case, nullable wherever the');
  L.push(' * column is, and deliberately not readonly. Map them at the adapter boundary —');
  L.push(' * the engine must never see a database row.');
  L.push(' *');
  L.push(' * schema_version  ' + manifest.schema_version);
  L.push(' * content_version ' + manifest.content_version);
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

  // Closed columns first: the row types below are written in terms of them.
  const columnType = new Map<string, string>();
  for (const [key, column] of Object.entries(manifest.enums)) {
    const name = enumName(key);
    if (columnType.has(name)) {
      fail(`two closed columns generate the same type name ${name}`);
    }
    columnType.set(key, name);
    L.push(`/** Every value \`${key}\` holds in this build. */`);
    L.push(`export type ${name} = ${column.values.map(v => JSON.stringify(v)).join(' | ')};`);
    L.push('');
  }

  for (const [table, columns] of Object.entries(manifest.tables)) {
    L.push(`/** ${table} — ${manifest.rows[table] ?? 0} rows in this build. */`);
    L.push(`export type ${pascal(table)}Row = {`);
    for (const column of columns) {
      const closed = columnType.get(`${table}.${column.name}`);
      const ts = closed ?? TS_TYPE[column.type.toUpperCase()] ?? 'unknown';
      L.push(`  ${column.name}: ${column.notnull ? ts : `${ts} | null`};`);
    }
    L.push('};');
    L.push('');
  }

  L.push(
    ...emitPayloadUnion('ExercisePayload', 'type', manifest.payloads, [
      'The parsed `exercise.payload_json`, discriminated on the exercise type.',
      '',
      'The column holds only the remainder — whatever a type needs that the shared',
      'columns and the option and chunk tables do not already carry. Eight of the',
      'sixteen types need nothing at all, which is the normalisation working rather',
      'than a gap.',
      '',
      'The discriminant is not in the stored JSON. It is `exercise.type`, and the',
      'mapper puts the two together, so the switch that reads a payload is exhaustive',
      'over the types the artifact actually contains.',
      '',
      'Keys beginning with an underscore are authoring notes carried in the stored',
      'bytes. They are typed here because they are there, and dropped at the mapper',
      'because the domain has no use for them.',
    ]),
  );

  L.push(
    ...emitPayloadUnion('StopPositionPayload', 'kind', manifest.position_payloads, [
      'The parsed `stop_position.payload_json`, discriminated on the position kind.',
      '',
      'A stop script is one ordered list of positions across both tracks, so the kinds',
      'are the union of what a Speak stop and a Read stop each need. Most carry',
      'nothing: a position that names an exercise or a card needs only the reference',
      'that is already in its own columns.',
    ]),
  );

  L.push('/**');
  L.push(' * The committed subset the web and test adapter reads.');
  L.push(' *');
  L.push(' * Generated from the fixture itself, so the tables it carries are the tables the');
  L.push(' * JSON adapter can be written against. A table the fixture stops carrying is a');
  L.push(' * compile error in that adapter rather than a query that quietly returns nothing.');
  L.push(' *');
  L.push(' * Every row here is a row read back out of the database that shipped with it, so');
  L.push(' * both adapters map the same shapes with the same code.');
  L.push(' */');
  L.push('export type ContentFixture = {');
  L.push('  content_version: string;');
  L.push('  schema_version: number;');
  for (const [key, value] of Object.entries(fixture)) {
    if (!Array.isArray(value)) {
      continue;
    }
    if (!manifest.tables[key]) {
      fail(`the fixture carries a "${key}" list that names no table in the manifest`);
    }
    L.push(`  ${key}: ${pascal(key)}Row[];`);
  }
  L.push('};');
  L.push('');

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

/**
 * Every table and its row count, in columns.
 *
 * Reporting all of them rather than the vocabulary count alone is the point. Schema
 * 3 shipped four declared-but-empty tables and its summary line looked exactly like
 * a build that shipped them full.
 */
function rowReport(rows: Record<string, number>): string {
  const names = Object.keys(rows).sort();
  const width = Math.max(...names.map(n => n.length));
  const perRow = 3;
  const lines: string[] = [];
  for (let i = 0; i < names.length; i += perRow) {
    lines.push(
      '              ' +
        names
          .slice(i, i + perRow)
          .map(n => `${n.padEnd(width)} ${String(rows[n] ?? 0).padStart(6)}`)
          .join('   '),
    );
  }
  return lines.join('\n');
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

  const fixtureText = fs.readFileSync(path.join(dist, 'content.fixture.json'), 'utf8');
  const fixture = JSON.parse(fixtureText) as Fixture;

  writeIfChanged(OUT_DB, db);
  writeIfChanged(OUT_FIXTURE, fixtureText);
  writeIfChanged(OUT_ROWS, emitRows(manifest, fixture));
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

  const total = Object.values(manifest.rows).reduce((sum, n) => sum + n, 0);
  const empty = Object.entries(manifest.rows)
    .filter(([, n]) => n === 0)
    .map(([table]) => table);

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
        `content ${manifest.content_version}, ${total} rows across ` +
        `${Object.keys(manifest.rows).length} tables)`,
    );
    return;
  }

  console.log(
    `sync-content: schema ${manifest.schema_version}, content ${manifest.content_version}\n` +
      `              ${total} rows across ${Object.keys(manifest.rows).length} tables, ` +
      `${Math.round(manifest.db_bytes / 1024)} KB\n` +
      rowReport(manifest.rows) +
      (empty.length ? `\n              EMPTY: ${empty.join(', ')}` : '') +
      (changed.length
        ? `\n              updated:\n${changed.map(f => `                ${path.relative(REPO, f)}`).join('\n')}`
        : `\n              no changes`),
  );
}

main();
