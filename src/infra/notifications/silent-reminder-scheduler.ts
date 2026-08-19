/**
 * @fileoverview A reminder scheduler that schedules nothing, on purpose.
 *
 * The web build's adapter, in the mould of `SilentCuePlayer`: not a fallback and not
 * a stub. `docs/06` runs the whole end-to-end suite against the Expo web build, where
 * `expo-notifications` local scheduling is not part of the product, so web needs an
 * adapter whose honest answer is "no reminders here".
 *
 * `getPermission` answers `denied` rather than `undetermined` for the same honesty:
 * `undetermined` is an invitation to ask, and asking on web could never lead to a
 * schedule. `denied` is the state every caller already handles by doing nothing.
 *
 * Like the silent cue player, it keeps no record of what it was asked to schedule —
 * a no-op that doubles as a spy is a test double living in shipping code.
 */

import type {ReminderScheduler} from '../../ports/reminder-scheduler';

export class SilentReminderScheduler implements ReminderScheduler {
  async getPermission(): Promise<'denied'> {
    return 'denied';
  }

  async requestPermission(): Promise<'denied'> {
    return 'denied';
  }

  async replaceSchedule(): Promise<void> {}

  async cancelAll(): Promise<void> {}
}
