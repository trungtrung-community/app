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
import type {VocabularyRow} from './rows.generated';
import {toFtsPrefixQuery} from './sqlite-content-source';

export type ContentFixture = {
  content_version: string;
  schema_version: number;
  districts: number[];
  vocabulary: VocabularyRow[];
};

export class JsonContentSource implements ContentSource {
  private readonly byId: Map<string, VocabularyItem>;
  private readonly items: readonly VocabularyItem[];

  constructor(private readonly fixture: ContentFixture) {
    this.items = fixture.vocabulary.map(toVocabularyItem);
    this.byId = new Map(this.items.map(item => [item.id, item]));
  }

  async getVocabulary(id: VocabId): Promise<VocabularyItem> {
    const item = this.byId.get(id);
    if (!item) {
      throw new Error(`no vocabulary record ${id}`);
    }
    return item;
  }

  async listVocabularyByDistrict(district: string): Promise<readonly VocabularyItem[]> {
    return this.items
      .filter(item => item.district === district)
      .sort((a, b) => a.districtNumber - b.districtNumber || a.slug.localeCompare(b.slug));
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
