/**
 * @fileoverview Content from the bundled SQLite artifact. The native adapter.
 *
 * Depends on a two-method query interface rather than on expo-sqlite, so the SQL,
 * the schema assertion and the search escaping are all testable in a plain Vitest
 * run. The real `SQLiteDatabase` satisfies the interface structurally.
 */

import type {ContentSource, VocabId, VocabularyItem} from '../../ports/content-source';
import {toVocabularyItem} from './mappers';
import {CONTENT_SCHEMA_VERSION, type VocabularyRow} from './rows.generated';

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

const VOCAB_COLUMNS =
  'id, slug, district, district_number, bo, roman, en, en_definition, ' +
  'wylie, thl, thl_note, pos, register, status, audio_natural, word_id';

const DEFAULT_SEARCH_LIMIT = 20;

export class SqliteContentSource implements ContentSource {
  private checked = false;

  constructor(private readonly db: ContentDatabase) {}

  async getVocabulary(id: VocabId): Promise<VocabularyItem> {
    await this.assertSchema();
    const row = await this.db.getFirstAsync<VocabularyRow>(
      `SELECT ${VOCAB_COLUMNS} FROM vocabulary WHERE id = ?`,
      [id],
    );
    if (!row) {
      throw new Error(`no vocabulary record ${id}`);
    }
    return toVocabularyItem(row);
  }

  /**
   * Every word a district teaches, which is not the same as every word it
   * coined.
   *
   * This was `WHERE district = ?` — the record's own home field — and it hid 79
   * words from the districts that teach them, across 18 of the 24 districts
   * there were then. Departure teaches 16 and the query returned 7. The join is the fix: `placement` holds
   * one `home` row per record plus a `reuse` row for every further district,
   * and the reuse rows are exactly what the old query could not see.
   *
   * `placement_district` serves the ordering now; `vocabulary_district` no
   * longer does, because the rows no longer come from a scan of one district's
   * own records. Sorting on the slug is what keeps both adapters agreeing.
   */
  async listVocabularyByDistrict(district: string): Promise<readonly VocabularyItem[]> {
    await this.assertSchema();
    const rows = await this.db.getAllAsync<VocabularyRow>(
      `SELECT ${VOCAB_COLUMNS.split(', ')
        .map(c => `v.${c}`)
        .join(', ')}
       FROM placement p
       JOIN vocabulary v ON v.id = p.vocab_id
       WHERE p.district_id = ?
       ORDER BY v.slug`,
      [`district.${district}`],
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
    await this.assertSchema();
    const match = toFtsPrefixQuery(query);
    if (match === null) {
      return [];
    }
    const rows = await this.db.getAllAsync<VocabularyRow>(
      `SELECT ${VOCAB_COLUMNS.split(', ')
        .map(c => `v.${c}`)
        .join(', ')}
       FROM vocabulary_fts f
       JOIN vocabulary v ON v.rowid = f.rowid
       WHERE vocabulary_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
      [match, limit],
    );
    return rows.map(toVocabularyItem);
  }

  async contentVersion(): Promise<string> {
    const row = await this.db.getFirstAsync<{value: string}>(
      "SELECT value FROM meta WHERE key = 'content_version'",
      [],
    );
    return row?.value ?? 'unknown';
  }

  /**
   * Confirm the database was built against the schema this code was generated for.
   *
   * Checked once, not per query. A mismatch means a column may have been renamed
   * under us, which would otherwise surface as `undefined` in the UI rather than as
   * an error — so it throws, and says how to fix it.
   */
  private async assertSchema(): Promise<void> {
    if (this.checked) {
      return;
    }
    const row = await this.db.getFirstAsync<{value: string}>(
      "SELECT value FROM meta WHERE key = 'schema_version'",
      [],
    );
    const found = Number(row?.value);
    if (found !== CONTENT_SCHEMA_VERSION) {
      throw new Error(
        `content schema mismatch: database reports ${row?.value ?? 'nothing'}, ` +
          `this build expects ${CONTENT_SCHEMA_VERSION}. Run: npm run sync:content`,
      );
    }
    this.checked = true;
  }
}

/**
 * Turn what a learner typed into an FTS5 prefix query.
 *
 * FTS5 has its own syntax, so raw input can be a syntax error rather than a search —
 * a stray quote or `NEAR` would throw at the learner. Every token is quoted and a
 * `*` appended, which makes search feel like it filters as you type. Tibetan works
 * unchanged: the index tokenizes the script, and prefix matching on `བཀྲ` finds
 * `བཀྲ་ཤིས`.
 *
 * Returns null when there is nothing searchable, so the caller returns no results
 * rather than running a query that matches everything.
 */
export function toFtsPrefixQuery(query: string): string | null {
  const tokens = query
    .trim()
    // Anything that is punctuation to FTS5 becomes a separator. The tsheg is a
    // Tibetan word separator, so it splits here too.
    .split(/[\s"'*():^,.;!?/\\[\]{}་།-]+/u)
    .filter(Boolean);
  if (tokens.length === 0) {
    return null;
  }
  return tokens.map(t => `"${t}"*`).join(' ');
}
