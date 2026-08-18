/**
 * @fileoverview Content from the committed fixture. The web and test adapter.
 *
 * Not a stand-in for the real thing — it is load-bearing. `expo-sqlite`'s web
 * support is alpha, and `docs/06-testing.md` runs the entire end-to-end suite on
 * the Expo web build, so web needs a source that works today. Tests want a small
 * deterministic one for the same reason.
 *
 * It reads `content.fixture.json`, a two-district subset emitted by the same
 * `build_db.py` run that writes the database. Sharing the emitter is the point: the
 * fixture cannot drift from the schema the SQLite adapter is written against.
 *
 * This is the port paying for itself on day one rather than in some future
 * migration.
 */

import type {ContentSource, VocabId, VocabularyItem} from '../../ports/content-source';
import {toVocabularyItem} from './mappers';
import type {DistrictRow, PlacementRow, VocabularyRow} from './rows.generated';
import {toFtsPrefixQuery} from './sqlite-content-source';

export type ContentFixture = {
  content_version: string;
  schema_version: number;
  /**
   * Every district the fixture's placements name — not only the two whose
   * vocabulary it holds. Two District 2 words are reused into the Family Home
   * and Departure, so those districts are here too, or a placement would point
   * at a district the file does not contain.
   */
  districts: DistrictRow[];
  vocabulary: VocabularyRow[];
  /** Vocabulary placements only. The app has no phrase-by-district query. */
  placements: PlacementRow[];
};

export class JsonContentSource implements ContentSource {
  private readonly byId: Map<string, VocabularyItem>;
  private readonly items: readonly VocabularyItem[];
  /** district id -> the ids it teaches, home and reused alike. */
  private readonly taughtIn: Map<string, string[]>;

  constructor(private readonly fixture: ContentFixture) {
    this.items = fixture.vocabulary.map(toVocabularyItem);
    this.byId = new Map(this.items.map(item => [item.id, item]));
    this.taughtIn = new Map();
    for (const placement of fixture.placements) {
      const ids = this.taughtIn.get(placement.district_id) ?? [];
      ids.push(placement.vocab_id);
      this.taughtIn.set(placement.district_id, ids);
    }
  }

  async getVocabulary(id: VocabId): Promise<VocabularyItem> {
    const item = this.byId.get(id);
    if (!item) {
      throw new Error(`no vocabulary record ${id}`);
    }
    return item;
  }

  /**
   * Every word the district teaches, read from placements rather than from the
   * record's own `district` — the same correction the SQLite adapter makes, and
   * it has to be the same or the end-to-end suite defends behaviour the device
   * does not have.
   *
   * Sorted by slug alone. Ordering by district number made sense while a list
   * could only hold one district's records; it cannot any more, and the SQLite
   * side orders by `v.slug`.
   */
  async listVocabularyByDistrict(district: string): Promise<readonly VocabularyItem[]> {
    const ids = this.taughtIn.get(`district.${district}`) ?? [];
    return ids
      .map(id => this.byId.get(id))
      .filter((item): item is VocabularyItem => item !== undefined)
      .sort((a, b) => a.slug.localeCompare(b.slug));
  }

  /**
   * Prefix search over script, romanization and gloss.
   *
   * Reuses the SQLite adapter's tokenizer so both adapters agree about what counts
   * as a token — otherwise a search that worked on web would come back empty on a
   * device, or the reverse, and the end-to-end suite would be testing the wrong
   * behaviour.
   */
  async searchVocabulary(query: string, limit = 20): Promise<readonly VocabularyItem[]> {
    const match = toFtsPrefixQuery(query);
    if (match === null) {
      return [];
    }
    const needles = [...match.matchAll(/"([^"]+)"/g)].map(m => (m[1] ?? '').toLowerCase());
    return this.items
      .filter(item => {
        const haystack = `${item.bo} ${item.roman} ${item.en}`.toLowerCase();
        return needles.every(needle => haystack.includes(needle));
      })
      .slice(0, limit);
  }

  async contentVersion(): Promise<string> {
    return this.fixture.content_version;
  }
}
