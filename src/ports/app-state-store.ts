/**
 * @fileoverview The device's bookkeeping — what the app remembers about itself,
 * never what the learner chose or learned.
 *
 * The line against `SettingsStore` is deliberate. Settings are choices: the
 * learner made each one and can change each one on a screen. App state is
 * bookkeeping: facts the app records about its own life on this device, which no
 * screen edits directly. Losing settings loses preferences; losing app state
 * loses only continuity — a session resumes from the start, a primer shows once
 * more. That difference in stakes is why they are separate stores with separate
 * defaults.
 *
 * Async for the same reason the other stores are: MMKV is synchronous today, but
 * a synchronous signature would put a synchronous read in every caller.
 */

/** Bumped when the stored shape changes, so a stored record migrates rather than guesses. */
export const APP_STATE_VERSION = 1;

/**
 * A parked session, or null when nothing is parked.
 *
 * `state` is opaque JSON at this port: ports import only domain, and the value is
 * an engine snapshot, so the resume use case owns encoding and validating it.
 * `stopId` and `contentVersion` sit beside it precisely so that validation can
 * refuse a snapshot that names a different stop or was cut against different
 * content.
 */
export type ParkedSession = {
  /** The stop the session was walking when it was parked. */
  readonly stopId: string;
  /** The content lock version the session was cut against. */
  readonly contentVersion: string;
  /** When the snapshot was taken, as an ISO timestamp. */
  readonly savedAt: string;
  /** The engine snapshot, opaque here — see the fileoverview. */
  readonly state: unknown;
};

export type AppState = {
  /**
   * The shape this record was written in. Always `APP_STATE_VERSION` in memory —
   * older stored records are migrated on load.
   */
  readonly version: typeof APP_STATE_VERSION;
  /** The parked session P4/S4·r resumes, or null when there is nothing to resume. */
  readonly session: ParkedSession | null;
  /** The day the last nudge was shown, as an ISO date, or null. N4 rate-limits on it. */
  readonly lastNudgeOn: string | null;
  /** Whether the microphone primer has been shown. M1 shows it exactly once. */
  readonly micPrimerSeen: boolean;
};

/** A first launch, and what a migrated record inherits for fields it predates. */
export const DEFAULT_APP_STATE: AppState = {
  version: APP_STATE_VERSION,
  session: null,
  lastNudgeOn: null,
  micPrimerSeen: false,
};

/** Read and write the app's device-local bookkeeping. */
export type AppStateStore = {
  /** The stored state, or the defaults on a first launch. */
  load(): Promise<AppState>;
  save(state: AppState): Promise<void>;
};
