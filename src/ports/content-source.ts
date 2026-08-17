/**
 * @fileoverview Read-only access to the bundled content set.
 *
 * Content is generated outside this repo — the design system's Python pipeline
 * validates it against 38 rules and compiles it to a SQLite artifact. The app
 * consumes that artifact and contains no conversion logic, so this port describes
 * capabilities rather than tables.
 *
 * Two adapters satisfy it from day one, which is why the port is not speculative:
 * SQLite on native, and a curated JSON fixture on web and in tests. `expo-sqlite`
 * web support is alpha and `docs/06` runs the whole end-to-end suite on the Expo
 * web build, so the second adapter is load-bearing immediately.
 */

/** Placeholder domain shapes. These fill in as the content tables are built out. */
export type DistrictId = string & {readonly __brand: 'DistrictId'};
export type StopId = string & {readonly __brand: 'StopId'};
export type VocabId = string & {readonly __brand: 'VocabId'};

/**
 * One vocabulary record.
 *
 * The naming triple is a design-system rule, not a display preference: Tibetan
 * first, then the romanization, then the English gloss, everywhere. `roman` is the
 * Trungtrung romanization and the one a learner reads. `thl` is the older scheme
 * and appears in exactly one place in the product — the "also written" row on the
 * word sheet — so it stays in the data but never becomes a label or a label's
 * accessible name.
 */
export type VocabularyItem = {
  readonly id: VocabId;
  readonly slug: string;
  readonly district: string;
  readonly districtNumber: number;
  readonly bo: string;
  readonly roman: string;
  readonly en: string;
  readonly enDefinition: string | null;
  readonly wylie: string | null;
  readonly thl: string | null;
  /** The one place THL is allowed to surface: the word sheet's "also written" row. */
  readonly thlNote: string | null;
  readonly pos: string | null;
  /** Drawn by WordRow as the register marker. */
  readonly register: string | null;
  /**
   * The clip id, not a URI. Turning one into something playable is `AudioSource`'s
   * job, which is what lets audio move behind a network later without touching
   * content.
   *
   * There is one recording per item and no slow variant. A slower reading is the
   * same clip played at a reduced rate with pitch correction, so nothing is stored
   * twice and a word cannot drift from its own slow reading.
   *
   * Null means no recording exists. The listen control is hidden rather than shown
   * broken.
   */
  readonly audio: {readonly natural: string | null};
};

export type ContentSource = {
  getVocabulary(id: VocabId): Promise<VocabularyItem>;
  /** Every vocabulary record in a district, in teaching order. */
  listVocabularyByDistrict(district: string): Promise<readonly VocabularyItem[]>;
  /** Backed by FTS5 on native. Matches Tibetan, romanization and gloss. */
  searchVocabulary(query: string, limit?: number): Promise<readonly VocabularyItem[]>;
  /** The content build this adapter is serving, for the version gate. */
  contentVersion(): Promise<string>;
};
