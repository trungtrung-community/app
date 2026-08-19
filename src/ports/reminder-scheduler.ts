/**
 * @fileoverview Scheduling the daily reminder — local notifications only, never push.
 *
 * The register is N1's: a walking companion, not a growth loop. One structural promise
 * from `docs/07` (2026-08-04, N1) is enforced here *by construction*: the app falls
 * silent after 60 idle days. A repeating trigger could never keep that promise — it
 * would fire forever without the app ever running again — so a schedule is a rolling
 * window of one-off daily instants that simply runs out. Every foreground replaces the
 * window; an abandoned phone stops hearing from us when the last instant passes.
 *
 * The window is at most 60 instants for a second, harder reason: iOS caps an app at 64
 * pending local notifications and silently drops the rest. 60 keeps the whole window
 * under the cap with room to spare, and happens to be exactly the silence promise.
 */

/**
 * One scheduled firing of the daily reminder.
 *
 * `at` is a timezone-less ISO datetime, `YYYY-MM-DDTHH:mm:00`. The shape is deliberate,
 * twice over. Offset-less keeps it wall-clock: `new Date(at)` interprets it in the
 * device's zone, which is what "19:00" means to a learner whichever city they wake up
 * in. A string rather than a `Date` keeps the port JSON-pure, so a plan can be logged,
 * snapshotted in a test, or diffed without instants collapsing to epoch numbers.
 */
export type ReminderInstant = {
  readonly at: string;
  readonly title: string;
  readonly body: string;
  /**
   * The stop a tap should land in (N2's deep link), or null for the plain daily line.
   *
   * Always null until the N2 landing exists to receive it; the field is here so the
   * port does not change shape when it does.
   */
  readonly stopId: string | null;
};

/** What the OS has told us about notification permission. */
export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

/** Schedule and clear the daily reminder window on the device. */
export type ReminderScheduler = {
  /** The current permission, without prompting. */
  getPermission(): Promise<ReminderPermission>;
  /**
   * Show the system prompt (O4's one ask).
   *
   * Never resolves `undetermined`: once asked, the learner has answered.
   */
  requestPermission(): Promise<'granted' | 'denied'>;
  /**
   * Replace whatever is pending with exactly `instants` — a cancel followed by a
   * schedule, never a merge.
   *
   * Idempotent, and called on every app foreground: the same plan twice leaves the
   * same window pending. Callers keep `instants` at 60 or fewer — see the
   * `@fileoverview` for why the number is 60.
   */
  replaceSchedule(instants: readonly ReminderInstant[]): Promise<void>;
  /** Clear every pending reminder. The reminder toggle's off position. */
  cancelAll(): Promise<void>;
};
