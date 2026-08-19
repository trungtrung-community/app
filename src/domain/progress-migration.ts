/**
 * @fileoverview Bringing a stored progress record up to the current shape.
 *
 * The migration lives in the domain because two callers need the same rules. The
 * MMKV adapter migrates what it loads. The restore use case (U3) migrates a
 * picked backup file, and must additionally tell a genuine old record apart from
 * a file that was never a backup — so `migrateProgress` answers null for garbage
 * instead of coercing it.
 *
 * The checks are shallow on purpose. They ask "is this a progress record?", not
 * "is every item well-formed?" — enough to reject a random JSON file without
 * turning the migration into a schema validator.
 */

import type {ItemProgress} from './item';

/** Bumped when the stored shape changes, so a restore migrates rather than guesses. */
export const PROGRESS_VERSION = 2;

/**
 * The persisted progress shape at the current version.
 *
 * Structurally identical to `Progress` in `src/ports/progress-store.ts`, which
 * documents each field. The domain may not import ports, so the shape is stated
 * here and the two stay assignable by structure.
 */
export type ProgressRecord = {
  readonly walkedOn: readonly string[];
  readonly items: Readonly<Record<string, ItemProgress>>;
  readonly completedStops: readonly string[];
  readonly version: number;
};

/** What a record looks like before the shallow checks have run. */
type UnverifiedRecord = {
  readonly walkedOn: readonly string[];
  readonly items: Readonly<Record<string, ItemProgress>>;
  readonly completedStops?: readonly string[];
  readonly version?: number;
};

/**
 * Bring a parsed record up to the current shape, or answer null for one that
 * was never a progress record at all.
 *
 * Unversioned records predate the `version` field and are treated as version 0.
 * Records below version 2 predate completed stops and gain an empty list. Later
 * migrations stack here, stepwise, so a learner two versions behind is carried
 * through each step rather than reset.
 */
export function migrateProgress(raw: unknown): ProgressRecord | null {
  if (!isRecordShaped(raw)) {
    return null;
  }

  if (raw.version === PROGRESS_VERSION) {
    return raw as ProgressRecord;
  }
  return {...raw, completedStops: raw.completedStops ?? [], version: PROGRESS_VERSION};
}

/** The shallow shape checks: the required fields exist and are the right kind. */
function isRecordShaped(raw: unknown): raw is UnverifiedRecord {
  if (!isPlainObject(raw)) {
    return false;
  }
  return (
    isStringArray(raw['walkedOn']) &&
    isPlainObject(raw['items']) &&
    (raw['version'] === undefined || typeof raw['version'] === 'number') &&
    (raw['completedStops'] === undefined || isStringArray(raw['completedStops']))
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every(entry => typeof entry === 'string');
}
