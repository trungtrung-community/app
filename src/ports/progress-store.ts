import type {ItemProgress} from '../domain/item';

/** Every walked day, and what the learner has done with each item. */
export type Progress = {
  /**
   * Distinct days with at least one completed stop, drill or review, ascending.
   *
   * Stored as the days themselves rather than a count because `Days walking` is
   * cumulative and never resets, so it must survive a restored backup that
   * overlaps days already recorded — a counter could not be merged.
   */
  readonly walkedOn: readonly string[];
  readonly items: Readonly<Record<string, ItemProgress>>;
  /** Bumped when the stored shape changes, so a restore can migrate rather than guess. */
  readonly version: number;
};

/**
 * Read and write the learner's progress.
 *
 * Async despite MMKV being synchronous. When progress eventually syncs, hydration
 * and writes become network-shaped, and a synchronous signature here would put a
 * synchronous read in every caller.
 *
 * The store is the cache of record for the UI: hydrate once, keep the snapshot in
 * a zustand slice for synchronous reads, and write through. That is how a synced
 * store would have to behave anyway, so the shape is right for both worlds.
 */
export type ProgressStore = {
  /** The stored progress, or an empty record on a first launch. */
  load(): Promise<Progress>;
  save(progress: Progress): Promise<void>;
  /**
   * A human-readable export, for the backup file in U1-U4.
   *
   * `docs/06` fixes the restore policy: when a backup and the device disagree,
   * both states are shown and nothing is restored silently. That same policy is
   * what a future sync conflict would reuse.
   */
  export(): Promise<string>;
  clear(): Promise<void>;
};
