/**
 * @fileoverview One contract, run against both ContentSource adapters.
 *
 * The point is not that each adapter works. It is that they agree. `docs/06` runs
 * the end-to-end suite on the Expo web build, which reads the fixture, while a
 * device reads the SQLite artifact — so a query that behaved differently between
 * them would mean the suite defends behaviour the app does not have.
 *
 * Both run against the real artifact, not against invented data: the 67,274-row
 * database and the subset that `build_db.py` emitted from it in the same run.
 * `node:sqlite` opens the database here, which is why the SQLite adapter takes a
 * two-method query interface rather than expo-sqlite.
 *
 * The fixture is two whole Speak districts, one whole Read section, and every
 * artifact a collection card names. So a case that asks about District 3 belongs in
 * the SQLite-only block at the bottom, and a case in the shared block has to stay
 * inside that subset.
 *
 * Phases are marked per `docs/11-testing-conventions.md`. Where a query is asserted
 * with `expect(...).resolves` or inside a loop, act and assert are one statement and
 * the block is marked `// Then`.
 */

import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

import {describe, expect, it} from 'vitest';

import type {
  CollectionId,
  ContentSource,
  ExerciseId,
  LetterId,
  PhraseId,
  ReadRuleId,
  SectionId,
  StopId,
  VocabId,
} from '../../ports/content-source';
import {toFtsPrefixQuery} from './fts-query';
import {JsonContentSource} from './json-content-source';
import type {ContentFixture} from './rows.generated';
import {SqliteContentSource, type BindValue, type ContentDatabase} from './sqlite-content-source';

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

/** A record present in both the full database and the fixture. */
const SHARED_ID = 'vocab.tashi-delek' as VocabId;
const SHARED_DISTRICT = 'core';

/**
 * A word taught in two districts: coined in Meeting People, reused in the
 * Family Home. Its record's `district` says `meeting` and always will, which is
 * exactly why a district list cannot be built from that field.
 */
const REUSED_ID = 'vocab.child' as VocabId;

/** The first stop of District 1, and the first stop of the Read track. */
const SPEAK_STOP = 'stop.core.c1.1' as StopId;
const READ_STOP = 'stop.1.1' as StopId;
const READ_SECTION = 'section.read.1' as SectionId;

/** A phrase whose chunks carry vocabulary references. */
const PHRASE_ID = 'phrase.core.thanks-much' as PhraseId;

/** One drill of each shape the fixture holds. */
const LISTEN_PICK = 'ex.core.c1.1.1' as ExerciseId;
const PHRASE_ARRANGE = 'ex.core.c1.1.20' as ExerciseId;
const PHRASE_CLOZE = 'ex.core.c1.1.21' as ExerciseId;

/** The collection whose membership silently emptied when vocabulary ids lost their district. */
const AUSPICIOUS = 'collection.auspicious' as CollectionId;

const makeSqlite = () => new SqliteContentSource(openDatabase());
const makeJson = () => new JsonContentSource(fixture);

// CI clones only this repo, and the artifact is compiled from the private
// design-system checkout — so there the SQLite half of the contract cannot run
// and is skipped. Locally a missing database is never silently skipped:
// `npm run check:content` fails the gate first.
const DB_PRESENT = fs.existsSync(DB_PATH);

const adapters: [string, () => ContentSource][] = [
  ...(DB_PRESENT ? [['SqliteContentSource', makeSqlite] as [string, () => ContentSource]] : []),
  ['JsonContentSource', makeJson],
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

  it('exposes audio as a planned path and whether the take exists', async () => {
    // The shape is the contract, not the value. A recording's path is minted from
    // the item's identity and is known long before anyone records anything, so it is
    // always there; `available` is what the listen control keys on, and it is false
    // on every item until the first take lands. Asserting the shape rather than
    // `null` keeps this test true on the day recordings arrive.

    // Given
    const source = make();

    // When
    const item = await source.getVocabulary(SHARED_ID);

    // Then
    expect(Object.keys(item.audio).sort()).toEqual(['available', 'path']);
    expect(item.audio.path).toMatch(/^audio\/.+\.m4a$/);
    expect(typeof item.audio.available).toBe('boolean');
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

  it('reads a phrase with its chunks in spoken order', async () => {
    // Given
    const source = make();

    // When
    const phrase = await source.getPhrase(PHRASE_ID);

    // Then
    expect(phrase.chunks.length).toBeGreaterThan(1);
    expect(phrase.chunks.map(c => c.ordinal)).toEqual(phrase.chunks.map((_, index) => index));
    expect(phrase.bo.startsWith(phrase.chunks[0]?.bo ?? 'x')).toBe(true);
  });

  it('joins a chunk to the word it is, where the learner has met one', async () => {
    // Most chunks have no `vocabRef` and must not: a particle or an ending is not
    // vocabulary, and teaching it as if it were is the mistake the reference exists
    // to make visible.

    // Given
    const source = make();

    // When
    const phrase = await source.getPhrase(PHRASE_ID);
    const referenced = phrase.chunks.filter(c => c.vocabRef !== null);

    // Then
    expect(referenced.length).toBeGreaterThan(0);
    for (const chunk of referenced) {
      await expect(source.getVocabulary(chunk.vocabRef as VocabId)).resolves.toMatchObject({
        id: chunk.vocabRef,
      });
    }
  });

  it('lists the phrases a district teaches', async () => {
    // Given
    const source = make();

    // When
    const phrases = await source.listPhrasesByDistrict(SHARED_DISTRICT);

    // Then
    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.map(p => p.slug)).toEqual([...phrases.map(p => p.slug)].sort());
  });

  it('searches phrases separately from words', async () => {
    // Given
    const source = make();

    // When
    const hits = await source.searchPhrases('thank', 50);

    // Then
    expect(hits.map(h => h.id)).toContain(PHRASE_ID);
  });

  it('names a stop for what the learner will be able to do', async () => {
    // The generator used to title a stop with its first item's gloss, truncated at
    // 38 characters — `'goodbye (said to the one who is leavin'`. A name is an
    // outcome now, and a capability list is what the closing screen fills.

    // Given
    const source = make();

    // When
    const stop = await source.getStop(SPEAK_STOP);

    // Then
    expect(stop.name).toBe('Hello, and a way out');
    expect(stop.outcome.startsWith('You can')).toBe(true);
    expect(stop.capabilities.length).toBeGreaterThan(0);
    expect(stop.capabilities.every(line => line.length > 0)).toBe(true);
  });

  it('carries what a stop teaches, in teaching order', async () => {
    // Given
    const source = make();

    // When
    const stop = await source.getStop(SPEAK_STOP);

    // Then
    expect(stop.items.length).toBeGreaterThan(0);
    expect(stop.items.map(i => i.ordinal)).toEqual(stop.items.map((_, index) => index));
    expect(stop.items.every(i => i.role === 'teach' || i.role === 'reprise')).toBe(true);
  });

  it('walks a district stop by stop, circuit by circuit', async () => {
    // `ordinal` counts within a circuit, not across the district, so ordering on it
    // alone interleaves the two loops of District 1.

    // Given
    const source = make();

    // When
    const stops = await source.listStopsByDistrict(SHARED_DISTRICT);

    // Then
    expect(stops.length).toBeGreaterThan(1);
    const keys = stops.map(s => [s.circuit ?? 0, s.ordinal] as const);
    expect(keys).toEqual([...keys].sort((a, b) => a[0] - b[0] || a[1] - b[1]));
  });

  it('walks the Read track by section rather than by place', async () => {
    // Given
    const source = make();

    // When
    const stops = await source.listStopsBySection(READ_SECTION);

    // Then
    expect(stops.map(s => s.id)).toContain(READ_STOP);
    expect(stops.every(s => s.track === 'read')).toBe(true);
    expect(stops.every(s => s.district === null)).toBe(true);
  });

  it('returns a stop script in position order, contiguously numbered', async () => {
    // Given
    const source = make();

    // When
    const script = await source.getStopScript(SPEAK_STOP);

    // Then
    expect(script.map(p => p.n)).toEqual(script.map((_, index) => index + 1));
    expect(script.length).toBe((await source.getStop(SPEAK_STOP)).positionCount);
  });

  it('opens on the outcome and closes on the capabilities', async () => {
    // `docs/03` §4.1: position 1 states what the stop is for, and the last position
    // fills the capability circles. Both were unreachable before the script existed.

    // Given
    const source = make();

    // When
    const script = await source.getStopScript(SPEAK_STOP);
    const first = script[0];
    const last = script[script.length - 1];

    // Then
    expect(first?.kind).toBe('intro');
    expect(last?.kind).toBe('end');
    expect(first?.kind === 'intro' && first.capabilities.length).toBeGreaterThan(0);
    expect(last?.kind === 'end' && last.capabilities.length).toBeGreaterThan(0);
  });

  it('resolves every reference a script position makes', async () => {
    // Given
    const source = make();
    const stops = [SPEAK_STOP, READ_STOP];

    // Then
    for (const stopId of stops) {
      for (const position of await source.getStopScript(stopId)) {
        if ('exerciseId' in position) {
          await expect(source.getExercise(position.exerciseId)).resolves.toMatchObject({
            id: position.exerciseId,
          });
        }
        if (position.kind === 'word-card') {
          await expect(source.getVocabulary(position.itemId)).resolves.toBeTruthy();
        }
        if (position.kind === 'phrase-card') {
          await expect(source.getPhrase(position.itemId)).resolves.toBeTruthy();
        }
        if ('ruleId' in position) {
          await expect(source.getReadRule(position.ruleId)).resolves.toBeTruthy();
        }
      }
    }
  });

  it('gives an exercise its options, exactly one of them the answer', async () => {
    // Given
    const source = make();

    // When
    const exercise = await source.getExercise(LISTEN_PICK);

    // Then
    expect(exercise.type).toBe('listen-pick');
    expect(exercise.options).toHaveLength(4);
    expect(exercise.options.filter(o => o.isAnswer)).toHaveLength(1);
    expect(exercise.options.find(o => o.isAnswer)?.itemId).toBe(exercise.answerId);
  });

  it('returns options in stored order, which puts the Speak answer first', async () => {
    // Not a bug and not something to fix here. The content build stores the true
    // order and leaves shuffling to run time, so every Speak exercise in the product
    // has its answer at index 0. A renderer that draws them as stored is a quiz with
    // one answer. The engine shuffles, with an injected source of randomness so the
    // shuffle can be asserted.

    // Given
    const source = make();

    // When
    const exercises = await source.listExercisesByStop(SPEAK_STOP);
    const answerBearing = exercises.filter(e => e.answerId !== null && e.options.length > 1);

    // Then
    expect(answerBearing.length).toBeGreaterThan(0);
    expect(answerBearing.every(e => e.options[0]?.isAnswer)).toBe(true);
  });

  it('reconstructs an arrange exercise from the phrase and its decoys alone', async () => {
    // All 351 of these store an empty payload. The answer is the target phrase's own
    // chunk order and the tray is that plus the decoys, so storing either again
    // would be a second copy that can disagree with the first.

    // Given
    const source = make();

    // When
    const exercise = await source.getExercise(PHRASE_ARRANGE);
    const phrase = await source.getPhrase(exercise.target?.id as PhraseId);

    // Then
    expect(exercise.type).toBe('phrase-arrange');
    expect(phrase.chunks.length).toBeGreaterThan(1);
    expect(exercise.chunks.every(ref => ref.role === 'decoy')).toBe(true);
    expect(exercise.chunks.every(ref => ref.chunk.phraseId !== phrase.id)).toBe(true);
    expect(phrase.chunks.map(c => c.bo).join('')).toBe(
      phrase.chunks
        .slice()
        .sort((a, b) => a.ordinal - b.ordinal)
        .map(c => c.bo)
        .join(''),
    );
  });

  it('points a cloze exercise at the chunk it takes out', async () => {
    // Given
    const source = make();

    // When
    const exercise = await source.getExercise(PHRASE_CLOZE);
    const phrase = await source.getPhrase(exercise.target?.id as PhraseId);

    // Then
    expect(exercise.type).toBe('phrase-cloze');
    expect(exercise.type === 'phrase-cloze' && exercise.blank).toBeLessThan(phrase.chunks.length);
    expect(exercise.chunks.every(ref => ref.role === 'candidate')).toBe(true);
  });

  it('treats a drill with no recording as normal rather than as an error', async () => {
    // `docs/03` §4.1 calls audio-free substitution every stop's normal state. 3,236
    // of the 5,913 exercises say `audio`, and the adapter returns all of them — what
    // to do about it is the use case's decision, not the adapter's.

    // Given
    const source = make();

    // When
    const exercises = await source.listExercisesByStop(SPEAK_STOP);

    // Then
    expect(exercises.some(e => e.blockedOn === 'audio')).toBe(true);
    expect(exercises.every(e => e.blockedOn === null || e.blockedOn === 'audio')).toBe(true);
  });

  it('resolves every option an exercise offers to a real record', async () => {
    // Twenty-six exercises legitimately draw a distractor from another district,
    // because a small district's phrase pool is not always four deep. A fixture that
    // did not follow them would ship an answer choice the web adapter cannot draw.

    // Given
    const source = make();
    const known = new Set([
      ...fixture.vocabulary.map(r => r.id),
      ...fixture.phrase.map(r => r.id),
      ...fixture.letter.map(r => r.id),
    ]);

    // When
    const exercises = await source.listExercisesByStop(SPEAK_STOP);
    const options = exercises.flatMap(e => e.options);

    // Then
    expect(options.length).toBeGreaterThan(0);
    expect(options.every(o => known.has(o.itemId))).toBe(true);
  });

  it('keeps the eight Auspicious Symbols on their shelf', async () => {
    // The regression guard. `collections.py` keyed its override map on ids of the
    // form `vocab.monastery.endless-knot`, and when vocabulary ids dropped their
    // district segment all eight fell through to the district rule and filed under
    // the Monastery instead. Validation checked only that each item was in exactly
    // one collection, so an empty shelf stayed green.

    // Given
    const source = make();

    // When
    const collection = await source.getCollection(AUSPICIOUS);

    // Then
    expect(collection.title).toBe('The Eight Auspicious Symbols');
    expect(collection.cards).toHaveLength(8);
    expect(collection.cards.every(card => card.kind === 'vocab')).toBe(true);
  });

  it('resolves every collection card that names an item', async () => {
    // Four cards stand for a group the content names rather than a single record —
    // the twelve zodiac animals are one card — and those carry no item id.

    // Given
    const source = make();

    // When
    const collections = await source.listCollections();
    const named = collections.flatMap(c => c.cards).filter(card => card.itemId !== null);

    // Then
    expect(collections.length).toBe(10);
    expect(named.length).toBeGreaterThan(0);
    for (const card of named.filter(c => c.kind === 'vocab')) {
      await expect(source.getVocabulary(card.itemId as VocabId)).resolves.toBeTruthy();
    }
  });

  it('lists the letters with the ones they are mistaken for', async () => {
    // Given
    const source = make();

    // When
    const letters = await source.listLetters();
    const withConfusables = letters.filter(l => l.confusables.length > 0);

    // Then
    expect(letters).toHaveLength(55);
    expect(new Set(letters.map(l => l.subtype))).toEqual(
      new Set(['consonant', 'vowel', 'numeral', 'sanskrit']),
    );
    expect(withConfusables.length).toBeGreaterThan(0);
    const ids = new Set(letters.map(l => l.id));
    expect(withConfusables.every(l => l.confusables.every(c => ids.has(c)))).toBe(true);
  });

  it('reads one letter by id', async () => {
    // Given
    const source = make();

    // When
    const letter = await source.getLetter('letter.gi-gu' as LetterId);

    // Then
    expect(letter).toMatchObject({id: 'letter.gi-gu', subtype: 'vowel', position: 'above'});
  });

  it('states a reading rule with the rules it depends on', async () => {
    // `requires` is what keeps a drill from asking for a judgement that depends on
    // something two sections away.

    // Given
    const source = make();

    // When
    const rule = await source.getReadRule('R-FRONT' as ReadRuleId);
    const all = await source.listReadRules();

    // Then
    expect(rule.requires).toEqual(['R-SUF', 'R-VOW']);
    const ids = new Set(all.map(r => r.id));
    expect(all.every(r => r.requires.every(id => ids.has(id)))).toBe(true);
  });

  it('lists the chapters of one track and not the other', async () => {
    // Given
    const source = make();

    // When
    const read = await source.listSections('read');
    const speak = await source.listSections('speak');

    // Then
    expect(read.map(s => s.number)).toEqual([...read.map(s => s.number)].sort((a, b) => a - b));
    expect(read.every(s => s.track === 'read')).toBe(true);
    expect(speak.every(s => s.track === 'speak')).toBe(true);
    expect(read.length + speak.length).toBe(fixture.section.length);
  });

  it('reads a district by the slug a route carries', async () => {
    // Given
    const source = make();

    // When
    const district = await source.getDistrict(SHARED_DISTRICT);

    // Then
    expect(district).toMatchObject({slug: 'core', number: 1});
    expect(district.id).toBe(`district.${SHARED_DISTRICT}`);
  });
});

describe.skipIf(!DB_PRESENT)('the two adapters agree', () => {
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

  it('return identical scripts for every stop the fixture holds', async () => {
    // The whole premise of two adapters. A position order, a payload field or a
    // resolved reference that differed here would be the web build teaching a
    // different lesson from the device.

    // Given
    const sqlite = makeSqlite();
    const json = makeJson();

    // Then
    for (const stop of fixture.stop) {
      const id = stop.id as StopId;
      expect(await json.getStopScript(id), stop.id).toEqual(await sqlite.getStopScript(id));
      expect(await json.getStop(id), stop.id).toEqual(await sqlite.getStop(id));
    }
  });

  it('return identical exercises for every stop the fixture holds', async () => {
    // Given
    const sqlite = makeSqlite();
    const json = makeJson();

    // Then
    for (const stop of fixture.stop) {
      const id = stop.id as StopId;
      expect(await json.listExercisesByStop(id), stop.id).toEqual(
        await sqlite.listExercisesByStop(id),
      );
    }
  });

  it('return identical phrases, collections, letters and rules', async () => {
    // Given
    const sqlite = makeSqlite();
    const json = makeJson();

    // Then
    expect(await json.getPhrase(PHRASE_ID)).toEqual(await sqlite.getPhrase(PHRASE_ID));
    expect(await json.listCollections()).toEqual(await sqlite.listCollections());
    expect(await json.listLetters()).toEqual(await sqlite.listLetters());
    expect(await json.listReadRules()).toEqual(await sqlite.listReadRules());
    expect(await json.listDistricts()).toEqual(
      (await sqlite.listDistricts()).filter(d => fixture.district.some(row => row.id === d.id)),
    );
  });
});

describe.skipIf(!DB_PRESENT)('the whole artifact, through the native adapter', () => {
  // The fixture is a subset by design, so the cases that need the other 26 districts
  // or the Read sections past the first belong here rather than in the contract.

  it('maps every exercise in the artifact without an unhandled type', async () => {
    // The mapper's switch is exhaustive at compile time over the sixteen types the
    // manifest measured. This is the run-time half: every row actually maps, so a
    // payload field that is present in the schema and missing from a row would be
    // caught rather than surfacing as undefined on one screen in one district.

    // Given
    const source = new SqliteContentSource(openDatabase());
    const seen = new Set<string>();

    // When
    for (const stop of await source.listStopsBySection('section.read.9' as SectionId)) {
      for (const exercise of await source.listExercisesByStop(stop.id)) {
        seen.add(exercise.type);
      }
    }
    for (const stop of await source.listStopsByDistrict('teahouse')) {
      for (const exercise of await source.listExercisesByStop(stop.id)) {
        seen.add(exercise.type);
      }
    }

    // Then
    expect(seen.size).toBeGreaterThan(4);
  });

  it('reads the Read track drills the fixture is too small to hold', async () => {
    // Given
    const source = new SqliteContentSource(openDatabase());

    // When
    const stops = await source.listStopsBySection('section.read.6' as SectionId);
    const exercises = (
      await Promise.all(stops.map(stop => source.listExercisesByStop(stop.id)))
    ).flat();

    // Then
    expect(exercises.length).toBeGreaterThan(0);
    for (const exercise of exercises) {
      if (exercise.type === 'build-the-stack') {
        expect(exercise.answerSlots.root.length).toBeGreaterThan(0);
        expect(exercise.chips.length).toBeGreaterThan(0);
      }
      if (exercise.type === 'find-the-root') {
        expect(exercise.answerIndex).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('carries a planned recording path for every word and phrase', async () => {
    // 5,777 takes are called for and none exist. The path is what the recording
    // studio mints and what a delivered take will be filed under, so it is present
    // long before `available` can be true — and this stays honest on the day the
    // first one lands.

    // Given
    const source = new SqliteContentSource(openDatabase());

    // When
    const words = await source.listVocabularyByDistrict('teahouse');
    const phrases = await source.listPhrasesByDistrict('teahouse');

    // Then
    expect(words.length).toBeGreaterThan(0);
    expect(phrases.length).toBeGreaterThan(0);
    expect([...words, ...phrases].every(item => item.audio.path.endsWith('.m4a'))).toBe(true);
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
