/**
 * @fileoverview Content from the committed fixture. The web and test adapter.
 *
 * Not a stand-in for the real thing — it is load-bearing. `expo-sqlite`'s web
 * support is alpha, and `docs/06-testing.md` runs the entire end-to-end suite on
 * the Expo web build, so web needs a source that works today. Tests want a small
 * deterministic one for the same reason.
 *
 * It reads `content.fixture.json`, a subset emitted by the same `build_db.py` run
 * that writes the database — two whole Speak districts, one whole Read section, and
 * every artifact a collection card names. The rows are read back out of the finished
 * database rather than assembled a second time from the source, so this adapter and
 * the SQLite one map identical shapes with identical code.
 *
 * **Where SQLite sorts, this sorts the same way.** SQLite compares text byte by
 * byte, so the comparisons below use `<` rather than `localeCompare`, which collates
 * and would put a hyphenated slug in a different place. A list that comes back in
 * one order on web and another on a device is a suite defending behaviour the app
 * does not have.
 *
 * This is the port paying for itself on day one rather than in some future
 * migration.
 */

import type {
  Collection,
  CollectionId,
  ContentSource,
  District,
  Exercise,
  ExerciseId,
  Letter,
  LetterId,
  PhraseId,
  PhraseItem,
  ReadRule,
  ReadRuleId,
  Section,
  SectionId,
  Stop,
  StopId,
  StopPosition,
  Track,
  VocabId,
  VocabularyItem,
} from '../../ports/content-source';
import {groupBy, indexBy} from './collect';
import {splitSearchTokens} from './fts-query';
import {
  toCollection,
  toDistrict,
  toExercise,
  toExerciseChunkRef,
  toLetter,
  toPhraseItem,
  toReadRule,
  toSection,
  toStop,
  toStopPosition,
  toVocabularyItem,
} from './mappers';
import type {
  ChunkRow,
  ContentFixture,
  DistrictRow,
  ExerciseRow,
  PhraseRow,
  StopRow,
  VocabularyRow,
} from './rows.generated';

const DEFAULT_SEARCH_LIMIT = 20;

/** SQLite's BINARY collation, which is what every `ORDER BY` in the other adapter uses. */
function byBytes(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Compare on each key in turn, first difference wins. */
function by<T>(...keys: ((row: T) => number | string)[]): (a: T, b: T) => number {
  return (a, b) => {
    for (const key of keys) {
      const left = key(a);
      const right = key(b);
      if (left !== right) {
        return typeof left === 'string' ? byBytes(left, right as string) : left - (right as number);
      }
    }
    return 0;
  };
}

/** The walking order both adapters use: circuit, then position in it, then the id. */
const IN_WALKING_ORDER = by<StopRow>(
  row => row.circuit ?? 0,
  row => row.ordinal,
  row => row.id,
);

export class JsonContentSource implements ContentSource {
  private readonly vocabulary: Map<string, VocabularyRow>;
  private readonly phrases: Map<string, PhraseRow>;
  private readonly chunksByPhrase: Map<string, ChunkRow[]>;
  private readonly districts: Map<string, DistrictRow>;
  /** District slug to id, because every by-district query takes the slug. */
  private readonly districtIdBySlug: Map<string, string>;
  private readonly stops: Map<string, StopRow>;
  private readonly exercises: Map<string, ExerciseRow>;

  constructor(private readonly fixture: ContentFixture) {
    this.vocabulary = indexBy(fixture.vocabulary, row => row.id);
    this.phrases = indexBy(fixture.phrase, row => row.id);
    this.chunksByPhrase = groupBy(fixture.chunk, row => row.phrase_id);
    this.districts = indexBy(fixture.district, row => row.id);
    this.districtIdBySlug = new Map(fixture.district.map(row => [row.slug, row.id]));
    this.stops = indexBy(fixture.stop, row => row.id);
    this.exercises = indexBy(fixture.exercise, row => row.id);
  }

  // ── Words and phrases ────────────────────────────────────────────────────────

  async getVocabulary(id: VocabId): Promise<VocabularyItem> {
    return toVocabularyItem(this.require(this.vocabulary, id, 'vocabulary'));
  }

  /**
   * Every word the district teaches, read from placements rather than from the
   * record's own `district` — the same correction the SQLite adapter makes, and it
   * has to be the same or the end-to-end suite defends behaviour the device does
   * not have.
   */
  async listVocabularyByDistrict(district: string): Promise<readonly VocabularyItem[]> {
    return this.placedIn(district, 'vocab', this.vocabulary)
      .sort(by(row => row.slug))
      .map(toVocabularyItem);
  }

  async searchVocabulary(
    query: string,
    limit = DEFAULT_SEARCH_LIMIT,
  ): Promise<readonly VocabularyItem[]> {
    return search(this.fixture.vocabulary, query, limit).map(toVocabularyItem);
  }

  async getPhrase(id: PhraseId): Promise<PhraseItem> {
    return this.withChunks(this.require(this.phrases, id, 'phrase'));
  }

  async listPhrasesByDistrict(district: string): Promise<readonly PhraseItem[]> {
    return this.placedIn(district, 'phrase', this.phrases)
      .sort(by(row => row.slug))
      .map(row => this.withChunks(row));
  }

  async searchPhrases(query: string, limit = DEFAULT_SEARCH_LIMIT): Promise<readonly PhraseItem[]> {
    return search(this.fixture.phrase, query, limit).map(row => this.withChunks(row));
  }

  // ── The map and the walk ─────────────────────────────────────────────────────

  async listSections(track: Track): Promise<readonly Section[]> {
    return this.fixture.section
      .filter(row => row.track === track)
      .sort(by(row => row.number))
      .map(toSection);
  }

  async listDistricts(): Promise<readonly District[]> {
    return [...this.fixture.district].sort(by(row => row.number)).map(toDistrict);
  }

  async getDistrict(slug: string): Promise<District> {
    const id = this.districtIdBySlug.get(slug);
    const row = id === undefined ? undefined : this.districts.get(id);
    if (!row) {
      throw new Error(`no district record ${slug}`);
    }
    return toDistrict(row);
  }

  async getStop(id: StopId): Promise<Stop> {
    return this.toStop(this.require(this.stops, id, 'stop'));
  }

  async listStopsByDistrict(district: string): Promise<readonly Stop[]> {
    const districtId = this.districtIdBySlug.get(district);
    return this.fixture.stop
      .filter(row => row.district_id === districtId)
      .sort(IN_WALKING_ORDER)
      .map(row => this.toStop(row));
  }

  async listStopsBySection(sectionId: SectionId): Promise<readonly Stop[]> {
    return this.fixture.stop
      .filter(row => row.section_id === sectionId)
      .sort(IN_WALKING_ORDER)
      .map(row => this.toStop(row));
  }

  async getStopScript(id: StopId): Promise<readonly StopPosition[]> {
    return this.fixture.stop_position
      .filter(row => row.stop_id === id)
      .sort(by(row => row.n))
      .map(toStopPosition);
  }

  // ── The drills ───────────────────────────────────────────────────────────────

  async getExercise(id: ExerciseId): Promise<Exercise> {
    return this.toExercise(this.require(this.exercises, id, 'exercise'));
  }

  async listExercisesByStop(id: StopId): Promise<readonly Exercise[]> {
    return this.fixture.exercise
      .filter(row => row.stop_id === id)
      .sort(by(row => row.ordinal))
      .map(row => this.toExercise(row));
  }

  // ── The shelves ──────────────────────────────────────────────────────────────

  async listCollections(): Promise<readonly Collection[]> {
    return [...this.fixture.collection].sort(by(row => row.id)).map(row => this.toCollection(row));
  }

  async getCollection(id: CollectionId): Promise<Collection> {
    const row = this.fixture.collection.find(candidate => candidate.id === id);
    if (!row) {
      throw new Error(`no collection record ${id}`);
    }
    return this.toCollection(row);
  }

  // ── The Read reference ───────────────────────────────────────────────────────

  async listLetters(): Promise<readonly Letter[]> {
    return [...this.fixture.letter]
      .sort(
        by(
          row => row.section,
          row => row.row ?? 0,
          row => row.col ?? 0,
          row => row.id,
        ),
      )
      .map(row => this.toLetter(row));
  }

  async getLetter(id: LetterId): Promise<Letter> {
    const row = this.fixture.letter.find(candidate => candidate.id === id);
    if (!row) {
      throw new Error(`no letter record ${id}`);
    }
    return this.toLetter(row);
  }

  async listReadRules(): Promise<readonly ReadRule[]> {
    return [...this.fixture.read_rule]
      .sort(
        by(
          row => row.section,
          row => row.id,
        ),
      )
      .map(row => this.toReadRule(row));
  }

  async getReadRule(id: ReadRuleId): Promise<ReadRule> {
    const row = this.fixture.read_rule.find(candidate => candidate.id === id);
    if (!row) {
      throw new Error(`no read_rule record ${id}`);
    }
    return this.toReadRule(row);
  }

  async contentVersion(): Promise<string> {
    return this.fixture.content_version;
  }

  // ── Assembling nested values ─────────────────────────────────────────────────

  private withChunks(row: PhraseRow): PhraseItem {
    const chunks = [...(this.chunksByPhrase.get(row.id) ?? [])].sort(by(chunk => chunk.ordinal));
    return toPhraseItem(row, chunks);
  }

  private toStop(row: StopRow): Stop {
    const district = row.district_id === null ? null : this.districts.get(row.district_id);
    const items = this.fixture.stop_item
      .filter(item => item.stop_id === row.id)
      .sort(by(item => item.ordinal));
    return toStop(row, district?.slug ?? null, items);
  }

  private toExercise(row: ExerciseRow): Exercise {
    const options = this.fixture.exercise_option
      .filter(option => option.exercise_id === row.id)
      .sort(by(option => option.ordinal));
    const refs = this.fixture.exercise_chunk_ref
      .filter(ref => ref.exercise_id === row.id)
      .sort(by(ref => ref.ordinal));
    return toExercise(
      row,
      options,
      refs.map(ref => {
        const chunk = this.fixture.chunk.find(candidate => candidate.id === ref.chunk_id);
        if (!chunk) {
          throw new Error(`content: ${row.id} names a missing chunk ${ref.chunk_id}`);
        }
        return toExerciseChunkRef(ref, chunk);
      }),
    );
  }

  private toCollection(row: {
    id: string;
    title: string;
    home: string;
    complete_when: 'all';
  }): Collection {
    const cards = this.fixture.collection_card
      .filter(card => card.collection_id === row.id)
      .sort(by(card => card.ordinal));
    return toCollection(row, cards);
  }

  private toLetter(row: ContentFixture['letter'][number]): Letter {
    const confusables = this.fixture.letter_confusable
      .filter(entry => entry.letter_id === row.id)
      .sort(by(entry => entry.ordinal));
    return toLetter(row, confusables);
  }

  private toReadRule(row: ContentFixture['read_rule'][number]): ReadRule {
    const requires = this.fixture.read_rule_requires
      .filter(entry => entry.rule_id === row.id)
      .sort(by(entry => entry.requires_id));
    return toReadRule(row, requires);
  }

  // ── Lookup plumbing ──────────────────────────────────────────────────────────

  /** Every record of one kind the district teaches, home and reused alike. */
  private placedIn<T>(district: string, kind: 'vocab' | 'phrase', records: Map<string, T>): T[] {
    const districtId = this.districtIdBySlug.get(district);
    if (districtId === undefined) {
      return [];
    }
    return this.fixture.placement
      .filter(placement => placement.district_id === districtId && placement.kind === kind)
      .map(placement => records.get(placement.item_id))
      .filter((row): row is T => row !== undefined);
  }

  private require<T>(records: Map<string, T>, id: string, table: string): T {
    const row = records.get(id);
    if (!row) {
      throw new Error(`no ${table} record ${id}`);
    }
    return row;
  }
}

/**
 * Prefix search over script, romanization and gloss.
 *
 * Matches a token PREFIX rather than a substring, because that is what the FTS5
 * index on the device does. A substring match would find `tea` inside `steal`, the
 * device would not, and the two adapters would disagree about the same query.
 */
function search<T extends {bo: string; roman: string; en: string}>(
  rows: readonly T[],
  query: string,
  limit: number,
): T[] {
  const needles = splitSearchTokens(query).map(token => token.toLowerCase());
  if (needles.length === 0) {
    return [];
  }
  return rows
    .filter(row => {
      const tokens = splitSearchTokens(`${row.bo} ${row.roman} ${row.en}`.toLowerCase());
      return needles.every(needle => tokens.some(token => token.startsWith(needle)));
    })
    .slice(0, limit);
}
