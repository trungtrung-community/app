/**
 * @fileoverview The learner's settings — preferences that change how content is
 * shown, never what has been learned.
 *
 * Async for the same reason `ProgressStore` is: MMKV is synchronous today, but a
 * synchronous signature here would put a synchronous read in every caller and turn
 * a future sync path into a rewrite rather than a swap.
 */

export type Settings = {
  /** Show the Wylie spelling line on word and phrase sheets. Advanced, off by default. */
  readonly wylie: boolean;
};

/** Read and write the learner's settings. */
export type SettingsStore = {
  /** The stored settings, or the defaults on a first launch. */
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
};
