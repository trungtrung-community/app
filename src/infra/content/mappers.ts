/**
 * @fileoverview The boundary between storage rows and domain values.
 *
 * A database row is snake_case, nullable wherever the column is, and keeps `audio`
 * in a flat column because that is how it stores best. A domain value is
 * camelCase and shaped the way the rules and the components want to read it. This
 * file is the only place that knows both.
 *
 * Keeping the two apart is what makes the storage swappable. The engine never sees a
 * row, so a remote adapter that returns a different wire shape only has to produce
 * the same domain value, and nothing above the mapper changes.
 *
 * There is deliberately no schema parsing here. The artifact is compiled and
 * verified upstream — `build_db.py` writes a manifest, `sync-content.ts` checks the
 * database against its digest, and `rows.generated.ts` is generated from that same
 * manifest — so per-row validation of trusted local data would cost 1045 parses at
 * startup for a guarantee the build already gives. The place for runtime validation
 * is the adapter that reads bytes off a network, and it does not exist yet.
 */

import type {VocabId, VocabularyItem} from '../../ports/content-source';
import type {VocabularyRow} from './rows.generated';

/** One stored row as the value the rest of the app works with. */
export function toVocabularyItem(row: VocabularyRow): VocabularyItem {
  return {
    id: row.id as VocabId,
    slug: row.slug,
    district: row.district,
    districtNumber: row.district_number,
    wordId: row.word_id,
    bo: row.bo,
    roman: row.roman,
    en: row.en,
    enDefinition: row.en_definition,
    wylie: row.wylie,
    thl: row.thl,
    thlNote: row.thl_note,
    pos: row.pos,
    register: row.register,
    audio: {natural: row.audio_natural},
  };
}
