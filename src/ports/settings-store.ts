/**
 * @fileoverview The learner's settings — preferences that change how content is
 * shown, never what has been learned.
 *
 * Async for the same reason `ProgressStore` is: MMKV is synchronous today, but a
 * synchronous signature here would put a synchronous read in every caller and turn
 * a future sync path into a rewrite rather than a swap.
 */

/** Bumped when the stored shape changes, so a stored record migrates rather than guesses. */
export const SETTINGS_VERSION = 2;

export type Settings = {
  /**
   * The shape this record was written in. Always `SETTINGS_VERSION` in memory —
   * older stored records are migrated on load.
   */
  readonly version: typeof SETTINGS_VERSION;
  /** Show the Wylie spelling line on word and phrase sheets. Advanced, off by default. */
  readonly wylie: boolean;
  /** Interface sounds on. P2's sound row. Mirrored into the cue player by the slice. */
  readonly sound: boolean;
  /** The correct-answer tick. P2's vibration row, mirrored the same way as `sound`. */
  readonly haptics: boolean;
  /** Practice without listening exercises, for a learner who cannot play audio. A1's switch. */
  readonly audioFree: boolean;
  /** What the learner came for: speaking, reading, or both. Chosen on K1. */
  readonly track: 'speak' | 'read' | 'both';
  /**
   * Daily pace in minutes: 5, 10 or 15. Chosen on O2.
   *
   * Defaults to the smallest — a deliberate product stance. A pace the learner can
   * always meet beats one they were flattered into.
   */
  readonly pace: 'p5' | 'p10' | 'p15';
  /**
   * The daily practice reminder. O4 asks for it; N3 schedules the notification.
   *
   * `hour` and `minute` are the device's local wall-clock time, 24-hour.
   */
  readonly reminder: {readonly enabled: boolean; readonly hour: number; readonly minute: number};
  /**
   * The day onboarding (S1..O4) finished, as an ISO date, or null before then.
   *
   * The gate: null routes a launch into onboarding rather than the tabs.
   */
  readonly onboardedOn: string | null;
};

/**
 * A first launch, and what a migrated record inherits for fields it predates.
 *
 * Chosen so a learner who never opens a settings screen gets the product as
 * designed, and a learner migrating from an older shape keeps exactly the
 * behaviour they had.
 */
export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  wylie: false,
  sound: true,
  haptics: true,
  audioFree: false,
  track: 'speak',
  pace: 'p5',
  reminder: {enabled: false, hour: 19, minute: 0},
  onboardedOn: null,
};

/** Read and write the learner's settings. */
export type SettingsStore = {
  /** The stored settings, or the defaults on a first launch. */
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
};
