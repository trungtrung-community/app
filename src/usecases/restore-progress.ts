/**
 * @fileoverview Restoring progress from a backup file (U3), and the comparison
 * that decides whether U4's conflict view is needed.
 *
 * `docs/02` fixes the policy: a restore always shows a summary of what the file
 * actually contains, and a conflict is never resolved silently. These functions
 * supply the pieces — parse, summarise, compare, apply — and the screen sequences
 * them. Nothing here recommends a side.
 *
 * Only `applyBackup` touches a port. The rest are pure functions over the domain,
 * so the summary and the comparison test with hand-built values and no doubles.
 */

import type {IsoDate} from '../domain/date';
import {countByState} from '../domain/item';
import {migrateProgress} from '../domain/progress-migration';
import type {Progress, ProgressStore} from '../ports/progress-store';

/** What a picked file turned out to be. The two errors get different copy. */
export type ParsedBackup = {progress: Progress} | {error: 'unreadable' | 'not-a-backup'};

/**
 * Read a picked file's text as a progress backup.
 *
 * `unreadable` means the text is not JSON at all; `not-a-backup` means it parsed
 * but was never a progress record. Old backups are migrated on the way in, and
 * garbage is never coerced into an empty record — a restore that silently
 * restores nothing would look like it worked.
 */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {error: 'unreadable'};
  }
  const progress = migrateProgress(raw);
  return progress === null ? {error: 'not-a-backup'} : {progress};
}

/** The U3 summary of what a backup file actually contains. */
export type BackupSummary = {
  readonly daysWalking: number;
  /** Items the learner has met, counting known ones — every known item was met first. */
  readonly itemsMet: number;
  readonly stopsDone: number;
  /** The most recent walked day, or null for a backup with no walked days. */
  readonly newestDay: IsoDate | null;
};

/**
 * Summarise a backup in the terms the learner knows from the You tab, so the
 * restore screen can show what the file holds before anything is applied.
 */
export function summariseBackup(progress: Progress): BackupSummary {
  const counts = countByState(Object.values(progress.items));
  return {
    daysWalking: progress.walkedOn.length,
    itemsMet: counts.met + counts.known,
    stopsDone: progress.completedStops.length,
    newestDay: newestWalkedDay(progress),
  };
}

export type BackupComparison = 'backup-newer' | 'backup-older' | 'equal';

/**
 * Which side has walked further: the device or the backup.
 *
 * Decided by the newest walked day, tie-broken by item count and then by stop
 * count — two sides that walked last on the same day are told apart by how much
 * they carry. `backup-older` is what sends the screen to U4: both states are
 * shown, the learner chooses, and nothing recommends a side.
 */
export function compareBackup(device: Progress, backup: Progress): BackupComparison {
  const byDay = compare(newestWalkedDay(backup) ?? '', newestWalkedDay(device) ?? '');
  if (byDay !== 'equal') {
    return byDay;
  }
  const byItems = compare(Object.keys(backup.items).length, Object.keys(device.items).length);
  if (byItems !== 'equal') {
    return byItems;
  }
  return compare(backup.completedStops.length, device.completedStops.length);
}

export type RestoreProgressDeps = {
  readonly store: ProgressStore;
};

/**
 * Persist a backup as the device's progress, replacing what was there.
 *
 * Returns the applied progress for the caller to forward to `useProgress.apply`,
 * the same hand-off `submitAnswer` uses — a use case never imports the slice.
 */
export async function applyBackup(
  deps: RestoreProgressDeps,
  progress: Progress,
): Promise<Progress> {
  await deps.store.save(progress);
  return progress;
}

/**
 * The most recent walked day, scanned rather than read from the end: the list is
 * stored ascending, but a backup file is authored outside the app and its order
 * is not guaranteed. Lexical order equals date order for `YYYY-MM-DD`.
 */
function newestWalkedDay(progress: Progress): IsoDate | null {
  let newest: string | null = null;
  for (const day of progress.walkedOn) {
    if (newest === null || day > newest) {
      newest = day;
    }
  }
  return newest as IsoDate | null;
}

/** `backup-newer` when the backup's value is larger. Works for days and counts alike. */
function compare(backup: string | number, device: string | number): BackupComparison {
  if (backup > device) {
    return 'backup-newer';
  }
  if (backup < device) {
    return 'backup-older';
  }
  return 'equal';
}
