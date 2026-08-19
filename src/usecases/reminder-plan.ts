/**
 * @fileoverview The reminder window, computed — pure, and silent by construction.
 *
 * `docs/07` (2026-08-04, N1) promises the app falls silent after 60 idle days. This
 * planner is how: it emits a rolling window of one-off instants, one per day, that
 * simply runs out. The window only rolls forward when the app foregrounds and replans,
 * so an untouched phone goes quiet on day 60 with no code running at all. See
 * `../ports/reminder-scheduler` for the iOS cap that independently pins the window
 * at 60.
 *
 * Deterministic: `today` and `now` arrive as arguments, the same way every rule in
 * src/domain takes its day. Nothing here may read the clock.
 */

import {addDays, type IsoDate} from '../domain/date';
import type {ReminderInstant} from '../ports/reminder-scheduler';
import type {Settings} from '../ports/settings-store';

/** Days in the rolling window — the 60-day silence promise, stated once. */
export const REMINDER_WINDOW_DAYS = 60;

/**
 * The one daily line, in N1's register: a companion naming a quiet walk. Never
 * loss-framed — no streaks, no guilt, nothing to protect. The board carries no
 * literal copy, so this pair is written to its `decision` text and lives here as
 * the single source for every scheduled day.
 */
export const REMINDER_COPY = {
  title: 'Trungtrung',
  body: 'A quiet walk through Lhasa is ready when you are.',
} as const;

/**
 * Plan the reminder window from the learner's settings.
 *
 * Disabled yields an empty plan. Enabled yields one instant per day at the chosen
 * wall-clock time for the next `REMINDER_WINDOW_DAYS` days, starting today when the
 * chosen time is still ahead of `now`, else tomorrow — a reminder must never fire
 * the moment it is planned.
 *
 * `stopId` stays null for now: the named-stop deep link payload arrives with the N2
 * landing that will receive it.
 *
 * @param input.now Minutes since local midnight, 0–1439.
 * @returns Instants in chronological order, ready for `replaceSchedule`.
 */
export function planReminders(input: {
  reminder: Settings['reminder'];
  today: IsoDate;
  now: number;
}): readonly ReminderInstant[] {
  const {reminder, today, now} = input;
  if (!reminder.enabled) {
    return [];
  }

  const chosenMinute = reminder.hour * 60 + reminder.minute;
  const firstDay = chosenMinute > now ? today : addDays(today, 1);
  const time = `${pad(reminder.hour)}:${pad(reminder.minute)}:00`;

  return Array.from({length: REMINDER_WINDOW_DAYS}, (unused, index) => ({
    at: `${addDays(firstDay, index)}T${time}`,
    title: REMINDER_COPY.title,
    body: REMINDER_COPY.body,
    stopId: null,
  }));
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
