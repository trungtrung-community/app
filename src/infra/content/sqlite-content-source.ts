/**
 * @fileoverview Content from the bundled SQLite artifact. The native adapter.
 *
 * Depends on a two-method query interface rather than on expo-sqlite, so the SQL,
 * the schema assertion and the search escaping are all testable in a plain Vitest
 * run. The real `SQLiteDatabase` satisfies the interface structurally.
 *
 * **Queries select `*`.** The row types are generated from the same manifest this
 * database was built against, so the column set is already the contract — and a
 * hand-written column list is the one way to fetch fewer columns than the row type
 * promises, which surfaces as `undefined` rather than as a build failure. Joins
 * qualify the star so two tables cannot contribute the same column name.
 */

import type {
  Affix,
  Collection,
  CollectionId,
  Combiner,
  CombinerId,
  ContentSource,
  District,
  Exercise,
  ExerciseChunkRef,
  ExerciseId,
  Letter,
  LetterId,
  Mark,
  PhraseId,
  PhraseItem,
  ReadCue,
  ReadRule,
  ReadRuleId,
  ReadWord,
  ReadWordId,
  Section,
  SectionId,
  Stack,
  StackId,
  Stop,
  StopId,
  StopPosition,
  Syllable,
  SyllableId,
  Track,
  VocabId,
  VocabularyItem,
} from '../../ports/content-source';
import {groupBy, indexBy} from './collect';
import {toFtsPrefixQuery} from './fts-query';
import {
  toAffix,
  toCollection,
  toCombiner,
  toDistrict,
  toExercise,
  toExerciseChunkRef,
  toLetter,
  toMark,
  toPhraseItem,
  toReadCue,
  toReadRule,
  toReadWord,
  toSection,
  toStack,
  toStop,
  toStopPosition,
  toSyllable,
  toVocabularyItem,
} from './mappers';
import {
  CONTENT_SCHEMA_VERSION,
  type AffixRow,
  type ChunkRow,
  type CollectionCardRow,
  type CollectionRow,
  type CombinerRow,
  type CombinerStackRow,
  type DistrictRow,
  type ExerciseChunkRefRow,
  type ExerciseOptionRow,
  type ExerciseRow,
  type LetterConfusableRow,
  type LetterRow,
  type MarkRow,
  type PhraseRow,
  type ReadCueRow,
  type ReadRuleRequiresRow,
  type ReadRuleRow,
  type ReadWordRow,
  type ReadWordRuleRow,
  type SectionRow,
  type StackRow,
  type StackRuleRow,
  type StopItemRow,
  type StopPositionRow,
  type StopRow,
  type SyllableFormRow,
  type SyllableRow,
  type SyllableRuleRow,
  type VocabularyRow,
} from './rows.generated';

/** What SQLite accepts as a bound parameter. Mirrors expo-sqlite's own union. */
export type BindValue = string | number | boolean | null | Uint8Array;

/**
 * The slice of expo-sqlite's SQLiteDatabase this adapter uses.
 *
 * Narrow on purpose: a real `SQLiteDatabase` satisfies it structurally, and so does
 * a `node:sqlite` handle, which is how the SQL in this file is tested against the
 * real artifact without a device.
 */
export type ContentDatabase = {
  getFirstAsync<T>(source: string, params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: BindValue[]): Promise<T[]>;
};

const DEFAULT_SEARCH_LIMIT = 20;

/** A stop with the slug of the district it belongs to, which the stop row cannot hold. */
type StopWithSlug = StopRow & {district_slug: string | null};

/**
 * The database, with the schema checked once before the first query reaches it.
 *
 * A decorator rather than a flag on the adapter. The check has one reason to change
 * and the queries have another, and without this every one of the twenty query
 * methods below would have to remember to await the same guard — which is the kind
 * of thing that is right nineteen times.
 */
class SchemaCheckedDatabase implements ContentDatabase {
  private checked: Promise<void> | null = null;

  constructor(private readonly db: ContentDatabase) {}

  async getFirstAsync<T>(source: string, params: BindValue[]): Promise<T | null> {
    await this.assertSchema();
    return this.db.getFirstAsync<T>(source, params);
  }

  async getAllAsync<T>(source: string, params: BindValue[]): Promise<T[]> {
    await this.assertSchema();
    return this.db.getAllAsync<T>(source, params);
  }

  /**
   * Confirm the database was built against the schema this code was generated for.
   *
   * Checked once, not per query, and memoised as the promise so that concurrent
   * first queries share one check rather than racing. A mismatch means a column may
   * have been renamed under us, which would otherwise surface as `undefined` in the
   * UI rather than as an error — so it throws, and says how to fix it.
   */
  private assertSchema(): Promise<void> {
    this.checked ??= this.db
      .getFirstAsync<{value: string}>("SELECT value FROM meta WHERE key = 'schema_version'", [])
      .then(row => {
        if (Number(row?.value) !== CONTENT_SCHEMA_VERSION) {
          throw new Error(
            `content schema mismatch: database reports ${row?.value ?? 'nothing'}, ` +
              `this build expects ${CONTENT_SCHEMA_VERSION}. Run: npm run sync:content`,
          );
        }
      });
    return this.checked;
  }
}

export class SqliteContentSource implements ContentSource {
  private readonly db: ContentDatabase;

  constructor(db: ContentDatabase) {
    this.db = new SchemaCheckedDatabase(db);
  }

  // ── Words and phrases ────────────────────────────────────────────────────────

  async getVocabulary(id: VocabId): Promise<VocabularyItem> {
    return toVocabularyItem(await this.one<VocabularyRow>('vocabulary', id));
  }

  /**
   * Every word a district teaches, which is not the same as every word it coined.
   *
   * This was `WHERE district = ?` — the record's own home field — and it hid 79
   * words from the districts that teach them, across 18 of the 24 districts there
   * were then. Departure teaches 16 and the query returned 7. The join is the fix:
   * `placement` holds one `home` row per record plus a `reuse` row for every further
   * district, and the reuse rows are exactly what the old query could not see.
   *
   * Sorting on the slug is what keeps both adapters agreeing.
   */
  async listVocabularyByDistrict(district: string): Promise<readonly VocabularyItem[]> {
    const rows = await this.db.getAllAsync<VocabularyRow>(
      `SELECT v.* FROM placement p
         JOIN vocabulary v ON v.id = p.item_id
         JOIN district d ON d.id = p.district_id
        WHERE d.slug = ? AND p.kind = 'vocab'
        ORDER BY v.slug`,
      [district],
    );
    return rows.map(toVocabularyItem);
  }

  /**
   * Prefix search over script, romanization and gloss.
   *
   * Rows, not words. Several entries can share a `wordId` — གྲང་མོ is one word
   * on three cards — and this deliberately does NOT collapse them in SQL.
   * Collapsing is a display decision nobody has made, and a search result also
   * has to be able to reach one card. The screen groups by `wordId` if it wants
   * to; the adapter does not decide for it.
   */
  async searchVocabulary(
    query: string,
    limit = DEFAULT_SEARCH_LIMIT,
  ): Promise<readonly VocabularyItem[]> {
    const rows = await this.search<VocabularyRow>('vocabulary', query, limit);
    return rows.map(toVocabularyItem);
  }

  async getPhrase(id: PhraseId): Promise<PhraseItem> {
    const row = await this.one<PhraseRow>('phrase', id);
    const chunks = await this.db.getAllAsync<ChunkRow>(
      'SELECT * FROM chunk WHERE phrase_id = ? ORDER BY ordinal',
      [id],
    );
    return toPhraseItem(row, chunks);
  }

  /** Taught, not homed — the same correction `listVocabularyByDistrict` makes. */
  async listPhrasesByDistrict(district: string): Promise<readonly PhraseItem[]> {
    const rows = await this.db.getAllAsync<PhraseRow>(
      `SELECT r.* FROM placement p
         JOIN phrase r ON r.id = p.item_id
         JOIN district d ON d.id = p.district_id
        WHERE d.slug = ? AND p.kind = 'phrase'
        ORDER BY r.slug`,
      [district],
    );
    return this.withChunks(rows);
  }

  async searchPhrases(query: string, limit = DEFAULT_SEARCH_LIMIT): Promise<readonly PhraseItem[]> {
    return this.withChunks(await this.search<PhraseRow>('phrase', query, limit));
  }

  // ── The map and the walk ─────────────────────────────────────────────────────

  async listSections(track: Track): Promise<readonly Section[]> {
    const rows = await this.db.getAllAsync<SectionRow>(
      'SELECT * FROM section WHERE track = ? ORDER BY number',
      [track],
    );
    return rows.map(toSection);
  }

  async listDistricts(): Promise<readonly District[]> {
    const rows = await this.db.getAllAsync<DistrictRow>(
      'SELECT * FROM district ORDER BY number',
      [],
    );
    return rows.map(toDistrict);
  }

  async getDistrict(slug: string): Promise<District> {
    const row = await this.db.getFirstAsync<DistrictRow>('SELECT * FROM district WHERE slug = ?', [
      slug,
    ]);
    if (!row) {
      throw new Error(`no district record ${slug}`);
    }
    return toDistrict(row);
  }

  async getStop(id: StopId): Promise<Stop> {
    const row = await this.db.getFirstAsync<StopWithSlug>(
      `SELECT s.*, d.slug AS district_slug FROM stop s
         LEFT JOIN district d ON d.id = s.district_id
        WHERE s.id = ?`,
      [id],
    );
    if (!row) {
      throw new Error(`no stop record ${id}`);
    }
    return (await this.withItems([row]))[0] as Stop;
  }

  /**
   * A district's stops, in walking order.
   *
   * Circuit first, because `ordinal` counts within a circuit and not across the
   * district — nine of District 1's stops share three ordinals between two circuits.
   * The id breaks any remaining tie so that both adapters return one order.
   */
  async listStopsByDistrict(district: string): Promise<readonly Stop[]> {
    const rows = await this.db.getAllAsync<StopWithSlug>(
      `SELECT s.*, d.slug AS district_slug FROM stop s
         JOIN district d ON d.id = s.district_id
        WHERE d.slug = ?
        ORDER BY COALESCE(s.circuit, 0), s.ordinal, s.id`,
      [district],
    );
    return this.withItems(rows);
  }

  async listStopsBySection(sectionId: SectionId): Promise<readonly Stop[]> {
    const rows = await this.db.getAllAsync<StopWithSlug>(
      `SELECT s.*, d.slug AS district_slug FROM stop s
         LEFT JOIN district d ON d.id = s.district_id
        WHERE s.section_id = ?
        ORDER BY COALESCE(s.circuit, 0), s.ordinal, s.id`,
      [sectionId],
    );
    return this.withItems(rows);
  }

  async getStopScript(id: StopId): Promise<readonly StopPosition[]> {
    const rows = await this.db.getAllAsync<StopPositionRow>(
      'SELECT * FROM stop_position WHERE stop_id = ? ORDER BY n',
      [id],
    );
    return rows.map(toStopPosition);
  }

  // ── The drills ───────────────────────────────────────────────────────────────

  async getExercise(id: ExerciseId): Promise<Exercise> {
    const row = await this.one<ExerciseRow>('exercise', id);
    return (await this.withOptionsAndChunks([row]))[0] as Exercise;
  }

  async listExercisesByStop(id: StopId): Promise<readonly Exercise[]> {
    const rows = await this.db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercise WHERE stop_id = ? ORDER BY ordinal',
      [id],
    );
    return this.withOptionsAndChunks(rows);
  }

  // ── The shelves ──────────────────────────────────────────────────────────────

  async listCollections(): Promise<readonly Collection[]> {
    const rows = await this.db.getAllAsync<CollectionRow>(
      'SELECT * FROM collection ORDER BY id',
      [],
    );
    return this.withCards(rows);
  }

  async getCollection(id: CollectionId): Promise<Collection> {
    const row = await this.one<CollectionRow>('collection', id);
    return (await this.withCards([row]))[0] as Collection;
  }

  // ── The Read reference ───────────────────────────────────────────────────────

  async listLetters(): Promise<readonly Letter[]> {
    const rows = await this.db.getAllAsync<LetterRow>(
      'SELECT * FROM letter ORDER BY section, COALESCE(row, 0), COALESCE(col, 0), id',
      [],
    );
    return this.withConfusables(rows);
  }

  async getLetter(id: LetterId): Promise<Letter> {
    return (await this.withConfusables([await this.one<LetterRow>('letter', id)]))[0] as Letter;
  }

  async listReadRules(): Promise<readonly ReadRule[]> {
    const rows = await this.db.getAllAsync<ReadRuleRow>(
      'SELECT * FROM read_rule ORDER BY section, id',
      [],
    );
    return this.withPrerequisites(rows);
  }

  async getReadRule(id: ReadRuleId): Promise<ReadRule> {
    const row = await this.one<ReadRuleRow>('read_rule', id);
    return (await this.withPrerequisites([row]))[0] as ReadRule;
  }

  // ── The stacks ───────────────────────────────────────────────────────────────

  async listStacks(): Promise<readonly Stack[]> {
    const rows = await this.db.getAllAsync<StackRow>(
      'SELECT * FROM stack ORDER BY section, id',
      [],
    );
    return this.withStackRules(rows);
  }

  async getStack(id: StackId): Promise<Stack> {
    return (await this.withStackRules([await this.one<StackRow>('stack', id)]))[0] as Stack;
  }

  // ── The syllable piles ───────────────────────────────────────────────────────

  async listSyllables(family: string, maxSection: number): Promise<readonly Syllable[]> {
    const rows = await this.db.getAllAsync<SyllableRow>(
      'SELECT * FROM syllable WHERE family = ? AND section <= ? ORDER BY section, id',
      [family, maxSection],
    );
    return this.withRulesAndForms(rows);
  }

  async countSyllables(family: string, maxSection: number): Promise<number> {
    const row = await this.db.getFirstAsync<{n: number}>(
      'SELECT COUNT(*) AS n FROM syllable WHERE family = ? AND section <= ?',
      [family, maxSection],
    );
    return row?.n ?? 0;
  }

  async getSyllable(id: SyllableId): Promise<Syllable> {
    const row = await this.one<SyllableRow>('syllable', id);
    return (await this.withRulesAndForms([row]))[0] as Syllable;
  }

  // ── The Read words ───────────────────────────────────────────────────────────

  async listReadWords(): Promise<readonly ReadWord[]> {
    const rows = await this.db.getAllAsync<ReadWordRow>(
      'SELECT * FROM read_word ORDER BY section, id',
      [],
    );
    return this.withWordRules(rows);
  }

  async getReadWord(id: ReadWordId): Promise<ReadWord> {
    const row = await this.one<ReadWordRow>('read_word', id);
    return (await this.withWordRules([row]))[0] as ReadWord;
  }

  // ── The attachment system and the page furniture ─────────────────────────────

  async listAffixes(): Promise<readonly Affix[]> {
    const rows = await this.db.getAllAsync<AffixRow>(
      'SELECT * FROM affix ORDER BY section, id',
      [],
    );
    return rows.map(toAffix);
  }

  async listCombiners(): Promise<readonly Combiner[]> {
    const rows = await this.db.getAllAsync<CombinerRow>(
      'SELECT * FROM combiner ORDER BY section, id',
      [],
    );
    return this.withCombinerStacks(rows);
  }

  async getCombiner(id: CombinerId): Promise<Combiner> {
    const row = await this.one<CombinerRow>('combiner', id);
    return (await this.withCombinerStacks([row]))[0] as Combiner;
  }

  async listMarks(): Promise<readonly Mark[]> {
    const rows = await this.db.getAllAsync<MarkRow>('SELECT * FROM mark ORDER BY section, id', []);
    return rows.map(toMark);
  }

  async listReadCues(): Promise<readonly ReadCue[]> {
    const rows = await this.db.getAllAsync<ReadCueRow>('SELECT * FROM read_cue ORDER BY n', []);
    return rows.map(toReadCue);
  }

  async contentVersion(): Promise<string> {
    const row = await this.db.getFirstAsync<{value: string}>(
      "SELECT value FROM meta WHERE key = 'content_version'",
      [],
    );
    return row?.value ?? 'unknown';
  }

  // ── Assembling nested values ─────────────────────────────────────────────────
  //
  // Each of these fetches the child rows for a whole batch in one query and groups
  // them, so listing a district's 45 phrases costs two queries rather than 46.

  private async withChunks(rows: readonly PhraseRow[]): Promise<readonly PhraseItem[]> {
    if (rows.length === 0) {
      return [];
    }
    const chunks = await this.db.getAllAsync<ChunkRow>(
      `SELECT * FROM chunk WHERE phrase_id IN (${placeholders(rows.length)})
        ORDER BY phrase_id, ordinal`,
      rows.map(r => r.id),
    );
    const byPhrase = groupBy(chunks, c => c.phrase_id);
    return rows.map(row => toPhraseItem(row, byPhrase.get(row.id) ?? []));
  }

  private async withItems(rows: readonly StopWithSlug[]): Promise<readonly Stop[]> {
    if (rows.length === 0) {
      return [];
    }
    const items = await this.db.getAllAsync<StopItemRow>(
      `SELECT * FROM stop_item WHERE stop_id IN (${placeholders(rows.length)})
        ORDER BY stop_id, ordinal`,
      rows.map(r => r.id),
    );
    const byStop = groupBy(items, i => i.stop_id);
    return rows.map(row => toStop(row, row.district_slug, byStop.get(row.id) ?? []));
  }

  private async withOptionsAndChunks(rows: readonly ExerciseRow[]): Promise<readonly Exercise[]> {
    if (rows.length === 0) {
      return [];
    }
    const ids = rows.map(r => r.id);
    const marks = placeholders(rows.length);
    const options = await this.db.getAllAsync<ExerciseOptionRow>(
      `SELECT * FROM exercise_option WHERE exercise_id IN (${marks})
        ORDER BY exercise_id, ordinal`,
      ids,
    );
    const refs = await this.db.getAllAsync<ExerciseChunkRefRow>(
      `SELECT * FROM exercise_chunk_ref WHERE exercise_id IN (${marks})
        ORDER BY exercise_id, ordinal`,
      ids,
    );
    // Two queries rather than a join, because `exercise_chunk_ref` and `chunk` both
    // have an `ordinal` and a qualified star cannot keep them apart.
    const chunks = refs.length
      ? await this.db.getAllAsync<ChunkRow>(
          `SELECT * FROM chunk WHERE id IN (${placeholders(refs.length)})`,
          refs.map(r => r.chunk_id),
        )
      : [];
    const chunkById = indexBy(chunks, c => c.id);
    const optionsByExercise = groupBy(options, o => o.exercise_id);
    const refsByExercise = groupBy(refs, r => r.exercise_id);

    return rows.map(row =>
      toExercise(
        row,
        optionsByExercise.get(row.id) ?? [],
        (refsByExercise.get(row.id) ?? []).map(ref => {
          const chunk = chunkById.get(ref.chunk_id);
          if (!chunk) {
            throw new Error(`content: ${row.id} names a missing chunk ${ref.chunk_id}`);
          }
          return toExerciseChunkRef(ref, chunk);
        }) satisfies ExerciseChunkRef[],
      ),
    );
  }

  private async withCards(rows: readonly CollectionRow[]): Promise<readonly Collection[]> {
    if (rows.length === 0) {
      return [];
    }
    const cards = await this.db.getAllAsync<CollectionCardRow>(
      `SELECT * FROM collection_card WHERE collection_id IN (${placeholders(rows.length)})
        ORDER BY collection_id, ordinal`,
      rows.map(r => r.id),
    );
    const byCollection = groupBy(cards, c => c.collection_id);
    return rows.map(row => toCollection(row, byCollection.get(row.id) ?? []));
  }

  private async withConfusables(rows: readonly LetterRow[]): Promise<readonly Letter[]> {
    if (rows.length === 0) {
      return [];
    }
    const confusables = await this.db.getAllAsync<LetterConfusableRow>(
      `SELECT * FROM letter_confusable WHERE letter_id IN (${placeholders(rows.length)})
        ORDER BY letter_id, ordinal`,
      rows.map(r => r.id),
    );
    const byLetter = groupBy(confusables, c => c.letter_id);
    return rows.map(row => toLetter(row, byLetter.get(row.id) ?? []));
  }

  private async withPrerequisites(rows: readonly ReadRuleRow[]): Promise<readonly ReadRule[]> {
    if (rows.length === 0) {
      return [];
    }
    const requires = await this.db.getAllAsync<ReadRuleRequiresRow>(
      `SELECT * FROM read_rule_requires WHERE rule_id IN (${placeholders(rows.length)})
        ORDER BY rule_id, requires_id`,
      rows.map(r => r.id),
    );
    const byRule = groupBy(requires, r => r.rule_id);
    return rows.map(row => toReadRule(row, byRule.get(row.id) ?? []));
  }

  private async withStackRules(rows: readonly StackRow[]): Promise<readonly Stack[]> {
    if (rows.length === 0) {
      return [];
    }
    const rules = await this.db.getAllAsync<StackRuleRow>(
      `SELECT * FROM stack_rule WHERE stack_id IN (${placeholders(rows.length)})
        ORDER BY stack_id, rule_id`,
      rows.map(r => r.id),
    );
    const byStack = groupBy(rules, r => r.stack_id);
    return rows.map(row => toStack(row, byStack.get(row.id) ?? []));
  }

  private async withRulesAndForms(rows: readonly SyllableRow[]): Promise<readonly Syllable[]> {
    if (rows.length === 0) {
      return [];
    }
    const ids = rows.map(r => r.id);
    const marks = placeholders(rows.length);
    const rules = await this.db.getAllAsync<SyllableRuleRow>(
      `SELECT * FROM syllable_rule WHERE syllable_id IN (${marks})
        ORDER BY syllable_id, rule_id`,
      ids,
    );
    const forms = await this.db.getAllAsync<SyllableFormRow>(
      `SELECT * FROM syllable_form WHERE syllable_id IN (${marks})
        ORDER BY syllable_id, ordinal`,
      ids,
    );
    const rulesBySyllable = groupBy(rules, r => r.syllable_id);
    const formsBySyllable = groupBy(forms, f => f.syllable_id);
    return rows.map(row =>
      toSyllable(row, rulesBySyllable.get(row.id) ?? [], formsBySyllable.get(row.id) ?? []),
    );
  }

  private async withWordRules(rows: readonly ReadWordRow[]): Promise<readonly ReadWord[]> {
    if (rows.length === 0) {
      return [];
    }
    const rules = await this.db.getAllAsync<ReadWordRuleRow>(
      `SELECT * FROM read_word_rule WHERE word_id IN (${placeholders(rows.length)})
        ORDER BY word_id, rule_id`,
      rows.map(r => r.id),
    );
    const byWord = groupBy(rules, r => r.word_id);
    return rows.map(row => toReadWord(row, byWord.get(row.id) ?? []));
  }

  private async withCombinerStacks(rows: readonly CombinerRow[]): Promise<readonly Combiner[]> {
    if (rows.length === 0) {
      return [];
    }
    const stacks = await this.db.getAllAsync<CombinerStackRow>(
      `SELECT * FROM combiner_stack WHERE combiner_id IN (${placeholders(rows.length)})
        ORDER BY combiner_id, stack_id`,
      rows.map(r => r.id),
    );
    const byCombiner = groupBy(stacks, s => s.combiner_id);
    return rows.map(row => toCombiner(row, byCombiner.get(row.id) ?? []));
  }

  // ── Query plumbing ───────────────────────────────────────────────────────────

  /** One row by id, or a named error. Every table here keys on `id`. */
  private async one<T>(table: string, id: string): Promise<T> {
    const row = await this.db.getFirstAsync<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!row) {
      throw new Error(`no ${table} record ${id}`);
    }
    return row;
  }

  /**
   * Ranked full-text search over one of the two indexed tables.
   *
   * The index is external-content, so the hit joins back to the table on rowid and
   * the caller gets whole rows rather than the three indexed columns.
   */
  private async search<T>(table: string, query: string, limit: number): Promise<T[]> {
    const match = toFtsPrefixQuery(query);
    if (match === null) {
      return [];
    }
    return this.db.getAllAsync<T>(
      `SELECT t.* FROM ${table}_fts f
         JOIN ${table} t ON t.rowid = f.rowid
        WHERE ${table}_fts MATCH ?
        ORDER BY rank
        LIMIT ?`,
      [match, limit],
    );
  }
}

/** `?, ?, ?` for an `IN` list of `count` bound values. */
function placeholders(count: number): string {
  return new Array(count).fill('?').join(', ');
}
