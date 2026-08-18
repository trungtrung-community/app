/**
 * @fileoverview One contract, run against both ContentSource adapters.
 *
 * The point is not that each adapter works. It is that they agree. `docs/06` runs
 * the end-to-end suite on the Expo web build, which reads the fixture, while a
 * device reads the SQLite artifact — so a search that behaves differently between
 * them would mean the suite defends behaviour the app does not have.
 *
 * Both run against the real artifact, not against invented data: the 1045-row
 * database and the two-district fixture that `build_db.py` emitted together.
 * `node:sqlite` opens the database here, which is why the SQLite adapter takes a
 * two-method query interface rather than expo-sqlite.
 *
 * Phases are marked per `docs/11-testing-conventions.md`. Where a query is asserted
 * with `expect(...).resolves` or inside a loop, act and assert are one statement and
 * the block is marked `// Then`.
 */

import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

import type {ContentSource, VocabId} from '../../ports/content-source';
import {JsonContentSource, type ContentFixture} from './json-content-source';
import {
  SqliteContentSource,
  toFtsPrefixQuery,
  type BindValue,
  type ContentDatabase,
} from './sqlite-content-source';

// Vitest runs from the repo root, so these are stable without import.meta.dirname.
const DB_PATH = path.resolve('assets/content.db');
const FIXTURE_PATH = path.resolve('src/infra/content/content.fixture.json');

const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8')) as ContentFixture;

/** node:sqlite behind the same interface expo-sqlite's SQLiteDatabase satisfies. */
function openDatabase(): ContentDatabase {
  const db = new DatabaseSync(DB_PATH, {readOnly: true});
  return {
    async getFirstAsync<T>(source: string, params: BindValue[]) {
      return (db.prepare(source).get(...(params as never[])) ?? null) as T | null;
    },
    async getAllAsync<T>(source: string, params: BindValue[]) {
      return db.prepare(source).all(...(params as never[])) as T[];
    },
  };
}

/** A record present in both the full database and the two-district fixture. */
const SHARED_ID = 'vocab.tashi-delek' as VocabId;
const SHARED_DISTRICT = 'core';

/**
 * A word taught in two districts: coined in Meeting People, reused in the
 * Family Home. Its record's `district` says `meeting` and always will, which is
 * exactly why a district list cannot be built from that field.
 */
const REUSED_ID = 'vocab.child' as VocabId;

const adapters: [string, () => ContentSource][] = [
  ['SqliteContentSource', () => new SqliteContentSource(openDatabase())],
  ['JsonContentSource', () => new JsonContentSource(fixture)],
];

describe.each(adapters)('%s', (_name, make) => {
  it('reads a record and maps it to domain shape', async () => {
    // Given
    const source = make();

    // When
    const item = await source.getVocabulary(SHARED_ID);

    // Then
    expect(item).toMatchObject({
      id: SHARED_ID,
      slug: 'tashi-delek',
      district: 'core',
      districtNumber: 1,
      bo: 'བཀྲ་ཤིས་བདེ་ལེགས',
      roman: 'trashi delek',
      en: 'hello / greetings',
    });
  });

  it('exposes audio as a clip id, not a URI', async () => {
    // The shape is the contract, not the value. Resolving a clip to something
    // playable belongs to AudioSource, and there is exactly one clip per item —
    // a slower reading is this one played at a reduced rate, never a second
    // recording. Asserting the key rather than `null` keeps this test true on
    // the day recordings actually land.

    // Given
    const source = make();

    // When
    const item = await source.getVocabulary(SHARED_ID);

    // Then
    expect(Object.keys(item.audio)).toEqual(['natural']);
    expect(item.audio.natural === null || typeof item.audio.natural === 'string').toBe(true);
  });

  it('uses camelCase domain keys, never database column names', async () => {
    // Given
    const source = make();

    // When
    const item = await source.getVocabulary(SHARED_ID);

    // Then
    expect(item).toHaveProperty('districtNumber');
    expect(item).not.toHaveProperty('district_number');
    expect(item).not.toHaveProperty('en_definition');
  });

  it('throws a named error for a missing record', async () => {
    // Given
    const source = make();

    // Then
    await expect(source.getVocabulary('vocab.nope' as VocabId)).rejects.toThrow(
      /no vocabulary record/,
    );
  });

  it('lists a district in teaching order', async () => {
    // Given
    const source = make();

    // When
    const items = await source.listVocabularyByDistrict(SHARED_DISTRICT);

    // Then
    expect(items.length).toBeGreaterThan(5);
    const slugs = items.map(i => i.slug);
    expect(slugs).toEqual([...slugs].sort());
    // Deliberately NOT `every(i => i.district === SHARED_DISTRICT)`. That held
    // only while a district could teach nothing but its own words, and it is
    // the assumption this suite now exists to disprove — District 1 simply
    // happens to receive no reuse. A list is what a district TEACHES.
    expect(items.some(i => i.district === SHARED_DISTRICT)).toBe(true);
  });

  it('finds a record by its romanization', async () => {
    // Given
    const source = make();

    // When
    const hits = await source.searchVocabulary('delek');

    // Then
    expect(hits.map(h => h.id)).toContain(SHARED_ID);
  });

  it('finds a record by its English gloss', async () => {
    // Given
    const source = make();

    // When
    const hits = await source.searchVocabulary('greetings');

    // Then
    expect(hits.map(h => h.id)).toContain(SHARED_ID);
  });

  it('finds a record by a Tibetan prefix', async () => {
    // The learner types the first syllable of བཀྲ་ཤིས་བདེ་ལེགས.

    // Given
    const source = make();

    // When
    const hits = await source.searchVocabulary('བཀྲ');

    // Then
    expect(hits.map(h => h.id)).toContain(SHARED_ID);
  });

  it('keeps distinct Tibetan stacks distinct', async () => {
    // A regression guard, not a nicety. FTS5's unicode61 tokenizer treats Tibetan
    // combining marks as non-token characters by default and drops them before
    // indexing, which made a search for བཀྲ also return བཀའ་འདྲི་ཞུ་བ — a different
    // word sharing only its base letters. `remove_diacritics 0` does not prevent it;
    // the tokenizer needs the Mark categories added. Telling one stack from another
    // is the whole subject of the glyph drills, so a sloppy match here is wrong in
    // the way that matters most.

    // Given
    const source = make();

    // When
    const hits = (await source.searchVocabulary('བཀྲ', 100)).map(h => h.id);

    // Then
    expect(hits).toContain('vocab.tashi-delek');
    expect(hits).not.toContain('vocab.to-ask');
  });

  it('returns nothing for an empty or punctuation-only query', async () => {
    // Given
    const source = make();

    // Then
    expect(await source.searchVocabulary('')).toEqual([]);
    expect(await source.searchVocabulary('   ')).toEqual([]);
    expect(await source.searchVocabulary('"*(')).toEqual([]);
  });

  it('does not throw on FTS syntax a learner might type', async () => {
    // Unescaped, each of these is an FTS5 syntax error rather than a search.

    // Given
    const source = make();
    const queries = ['"', 'NEAR', 'a AND', '*', 'foo^bar', "it's"];

    // Then
    for (const query of queries) {
      await expect(source.searchVocabulary(query)).resolves.toBeInstanceOf(Array);
    }
  });

  it('honours the result limit', async () => {
    // Given
    const source = make();

    // When
    const hits = await source.searchVocabulary('a', 3);

    // Then
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it('lists a word in every district that teaches it, not only its home', async () => {
    // Given
    // `child` is a District 2 word the spec reuses into the Family Home. Its
    // record says district `meeting`, because that is where the word was
    // coined — so a query that reads the record's own district finds it in
    // District 2 and nowhere else. It is taught in both.
    const source = make();

    // When
    const home = await source.listVocabularyByDistrict('meeting');
    const reusing = await source.listVocabularyByDistrict('family');

    // Then
    expect(home.map(i => i.id)).toContain(REUSED_ID);
    expect(reusing.map(i => i.id)).toContain(REUSED_ID);
  });

  it('keeps the home district on the record while listing it elsewhere', async () => {
    // Given
    const source = make();

    // When
    const reusing = await source.listVocabularyByDistrict('family');
    const item = reusing.find(i => i.id === REUSED_ID);

    // Then
    // `district` is the HOME placement and stays that way. A word listed in
    // the Family Home still belongs to Meeting People, and the card that
    // draws it should say so.
    expect(item?.district).toBe('meeting');
  });

  it('carries the word id, so two cards of one word can be told apart', async () => {
    // Given
    const source = make();

    // When
    const item = await source.getVocabulary(SHARED_ID);

    // Then
    expect(item.wordId).toMatch(/^word\.\d{4}$/);
  });

  it('reports the content version it is serving', async () => {
    // Given
    const source = make();

    // When
    const version = await source.contentVersion();

    // Then
    expect(version).toBe(fixture.content_version);
  });
});

describe('the two adapters agree', () => {
  const [, makeSqlite] = adapters[0] as [string, () => ContentSource];
  const [, makeJson] = adapters[1] as [string, () => ContentSource];

  it('return identical records for a shared id', async () => {
    // Given
    const sqlite = makeSqlite();
    const json = makeJson();

    // When
    const fromSqlite = await sqlite.getVocabulary(SHARED_ID);
    const fromJson = await json.getVocabulary(SHARED_ID);

    // Then
    expect(fromSqlite).toEqual(fromJson);
  });

  it('agree about which records a search finds within the fixture districts', async () => {
    // Given
    const inFixture = new Set(fixture.vocabulary.map(r => r.id));
    const queries = ['delek', 'tea', 'བཀྲ', 'butter'];

    // Then
    for (const query of queries) {
      const sqlite = (await makeSqlite().searchVocabulary(query, 100))
        .filter(i => inFixture.has(i.id))
        .map(i => i.id)
        .sort();
      const json = (await makeJson().searchVocabulary(query, 100)).map(i => i.id).sort();
      expect(json, `query: ${query}`).toEqual(sqlite);
    }
  });
});

describe('toFtsPrefixQuery', () => {
  it('quotes each token and makes it a prefix', () => {
    // Given
    const typed = 'butter tea';

    // When
    const query = toFtsPrefixQuery(typed);

    // Then
    expect(query).toBe('"butter"* "tea"*');
  });

  it('splits on the tsheg, which separates Tibetan words', () => {
    // Given
    const typed = 'བཀྲ་ཤིས';

    // When
    const query = toFtsPrefixQuery(typed);

    // Then
    expect(query).toBe('"བཀྲ"* "ཤིས"*');
  });

  it('strips the FTS operators that would otherwise be a syntax error', () => {
    // Given
    const typed = '"quoted" *star*';

    // When
    const query = toFtsPrefixQuery(typed);

    // Then
    expect(query).toBe('"quoted"* "star"*');
  });

  it('is null when nothing searchable remains', () => {
    // Given
    const typed = ['', '  ', '***'];

    // Then
    for (const value of typed) {
      expect(toFtsPrefixQuery(value)).toBeNull();
    }
  });
});

describe('the schema contract', () => {
  it('refuses to read a database built against a different schema', async () => {
    // Given
    const lying: ContentDatabase = {
      async getFirstAsync<T>(source: string) {
        if (source.includes('schema_version')) {
          return {value: '99'} as T;
        }
        return null;
      },
      async getAllAsync<T>() {
        return [] as T[];
      },
    };

    // Then
    await expect(new SqliteContentSource(lying).getVocabulary(SHARED_ID)).rejects.toThrow(
      /content schema mismatch/,
    );
  });
});
