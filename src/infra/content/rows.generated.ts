/**
 * @fileoverview GENERATED FILE — DO NOT EDIT.
 *
 * Regenerate with:  npm run sync:content
 * Verify with:      npm run check:content
 *
 * The shape of each table in the compiled content artifact, generated from
 * its manifest. These are STORAGE types, not domain types: snake_case, and
 * nullable wherever the column is. Map them at the adapter boundary — the
 * engine must never see a database row.
 *
 * schema_version  2
 * content_version a82ab13f20705295
 */

/**
 * The schema this file was generated against.
 *
 * The adapter asserts the opened database reports the same number. A content
 * build with a changed schema therefore fails loudly at startup rather than
 * returning undefined for a renamed column.
 */
export const CONTENT_SCHEMA_VERSION = 2;

/**
 * The content build this app bundles.
 *
 * expo-sqlite copies a bundled database to the app directory on first launch
 * and does NOT replace it on a later app update. So the adapter compares this
 * against what the copied file reports and re-imports when they differ, which
 * is safe because progress lives in MMKV and never in the content database.
 */
export const CONTENT_VERSION = "a82ab13f20705295";

/** collection — 0 rows in this build. */
export type CollectionRow = {
  id: string;
  name: string;
  kind: string;
};

/** district — 0 rows in this build. */
export type DistrictRow = {
  id: string;
  number: number;
  name: string;
  section: number;
};

/** exercise — 0 rows in this build. */
export type ExerciseRow = {
  id: string;
  stop_id: string;
  ordinal: number;
  family: string;
  payload_json: string;
};

/** meta — 0 rows in this build. */
export type MetaRow = {
  key: string;
  value: string;
};

/** phrase — 0 rows in this build. */
export type PhraseRow = {
  id: string;
  bo: string;
  roman: string;
  en: string;
};

/** stop — 0 rows in this build. */
export type StopRow = {
  id: string;
  district: string;
  ordinal: number;
  kind: string;
  circuit: number;
};

/** vocabulary — 1045 rows in this build. */
export type VocabularyRow = {
  id: string | null;
  slug: string;
  district: string;
  district_number: number;
  bo: string;
  roman: string;
  en: string;
  en_definition: string | null;
  wylie: string | null;
  thl: string | null;
  thl_note: string | null;
  pos: string | null;
  register: string | null;
  status: string | null;
  audio_natural: string | null;
};
