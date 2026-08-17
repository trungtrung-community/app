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
const SHARED_ID = 'vocab.core.tashi-delek' as VocabId;
const SHARED_DISTRICT = 'core';

const adapters: [string, () => ContentSource][] = [
  ['SqliteContentSource', () => new SqliteContentSource(openDatabase())],
  ['JsonContentSource', () => new JsonContentSource(fixture)],
];

describe.each(adapters)('%s', (_name, make) => {
  it('reads a record and maps it to domain shape', async () => {
    const item = await make().getVocabulary(SHARED_ID);
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

  it('exposes audio as clip ids, not URIs', async () => {
    const item = await make().getVocabulary(SHARED_ID);
    // No recordings exist yet, so both are null — but the SHAPE is the contract:
    // resolving a clip to something playable belongs to AudioSource.
    expect(item.audio).toEqual({natural: null, slow: null});
  });

  it('uses camelCase domain keys, never database column names', async () => {
    const item = await make().getVocabulary(SHARED_ID);
    expect(item).toHaveProperty('districtNumber');
    expect(item).not.toHaveProperty('district_number');
    expect(item).not.toHaveProperty('en_definition');
  });

  it('throws a named error for a missing record', async () => {
    await expect(make().getVocabulary('vocab.core.nope' as VocabId)).rejects.toThrow(
      /no vocabulary record/,
    );
  });

  it('lists a district in teaching order', async () => {
    const items = await make().listVocabularyByDistrict(SHARED_DISTRICT);
    expect(items.length).toBeGreaterThan(5);
    expect(items.every(i => i.district === SHARED_DISTRICT)).toBe(true);
    const slugs = items.map(i => i.slug);
    expect(slugs).toEqual([...slugs].sort());
  });

  it('finds a record by its romanization', async () => {
    const hits = await make().searchVocabulary('delek');
    expect(hits.map(h => h.id)).toContain(SHARED_ID);
  });

  it('finds a record by its English gloss', async () => {
    const hits = await make().searchVocabulary('greetings');
    expect(hits.map(h => h.id)).toContain(SHARED_ID);
  });

  it('finds a record by a Tibetan prefix', async () => {
    // The learner types the first syllable of བཀྲ་ཤིས་བདེ་ལེགས.
    const hits = await make().searchVocabulary('བཀྲ');
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
    const hits = (await make().searchVocabulary('བཀྲ', 100)).map(h => h.id);
    expect(hits).toContain('vocab.core.tashi-delek');
    expect(hits).not.toContain('vocab.core.to-ask');
  });

  it('returns nothing for an empty or punctuation-only query', async () => {
    expect(await make().searchVocabulary('')).toEqual([]);
    expect(await make().searchVocabulary('   ')).toEqual([]);
    expect(await make().searchVocabulary('"*(')).toEqual([]);
  });

  it('does not throw on FTS syntax a learner might type', async () => {
    // Unescaped, each of these is an FTS5 syntax error rather than a search.
    for (const query of ['"', 'NEAR', 'a AND', '*', 'foo^bar', "it's"]) {
      await expect(make().searchVocabulary(query)).resolves.toBeInstanceOf(Array);
    }
  });

  it('honours the result limit', async () => {
    const hits = await make().searchVocabulary('a', 3);
    expect(hits.length).toBeLessThanOrEqual(3);
  });

  it('reports the content version it is serving', async () => {
    expect(await make().contentVersion()).toBe(fixture.content_version);
  });
});

describe('the two adapters agree', () => {
  const [, makeSqlite] = adapters[0] as [string, () => ContentSource];
  const [, makeJson] = adapters[1] as [string, () => ContentSource];

  it('return identical records for a shared id', async () => {
    expect(await makeSqlite().getVocabulary(SHARED_ID)).toEqual(
      await makeJson().getVocabulary(SHARED_ID),
    );
  });

  it('agree about which records a search finds within the fixture districts', async () => {
    const inFixture = new Set(fixture.vocabulary.map(r => r.id));
    for (const query of ['delek', 'tea', 'བཀྲ', 'butter']) {
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
    expect(toFtsPrefixQuery('butter tea')).toBe('"butter"* "tea"*');
  });

  it('splits on the tsheg, which separates Tibetan words', () => {
    expect(toFtsPrefixQuery('བཀྲ་ཤིས')).toBe('"བཀྲ"* "ཤིས"*');
  });

  it('strips the FTS operators that would otherwise be a syntax error', () => {
    expect(toFtsPrefixQuery('"quoted" *star*')).toBe('"quoted"* "star"*');
  });

  it('is null when nothing searchable remains', () => {
    expect(toFtsPrefixQuery('')).toBeNull();
    expect(toFtsPrefixQuery('  ')).toBeNull();
    expect(toFtsPrefixQuery('***')).toBeNull();
  });
});

describe('the schema contract', () => {
  it('refuses to read a database built against a different schema', async () => {
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
    await expect(new SqliteContentSource(lying).getVocabulary(SHARED_ID)).rejects.toThrow(
      /content schema mismatch/,
    );
  });
});
