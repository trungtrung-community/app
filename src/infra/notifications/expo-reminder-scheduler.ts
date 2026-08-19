/**
 * @fileoverview The reminder scheduler on a real device, over `expo-notifications`.
 *
 * Every trigger is a one-off `DATE` trigger — never a repeating one. That is the
 * whole design (see the port's `@fileoverview`): a repeating trigger could not fall
 * silent after 60 idle days, so silence is achieved by scheduling a finite window
 * that runs out. Local notifications only; the push entitlement is stripped by
 * `plugins/without-push-entitlement.js`.
 */

import * as Notifications from 'expo-notifications';

import type {
  ReminderInstant,
  ReminderPermission,
  ReminderScheduler,
} from '../../ports/reminder-scheduler';

/** The device adapter. Stateless — the pending window lives in the OS. */
export class ExpoReminderScheduler implements ReminderScheduler {
  async getPermission(): Promise<ReminderPermission> {
    const {status} = await Notifications.getPermissionsAsync();
    return toPermission(status);
  }

  async requestPermission(): Promise<'granted' | 'denied'> {
    const {status} = await Notifications.requestPermissionsAsync();
    return toPermission(status) === 'granted' ? 'granted' : 'denied';
  }

  async replaceSchedule(instants: readonly ReminderInstant[]): Promise<void> {
    await this.cancelAll();
    for (const instant of instants) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: instant.title,
          body: instant.body,
          // The payload N2's landing will read. Absent entirely for the plain
          // daily line, so a listener can tell "no stop named" from "stop lost".
          ...(instant.stopId === null ? {} : {data: {stopId: instant.stopId}}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          // `at` is offset-less (`YYYY-MM-DDTHH:mm:00`), which `Date` parses as
          // device-local wall-clock time — the meaning the port promises.
          date: new Date(instant.at),
        },
      });
    }
  }

  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

/**
 * Map the platform's permission status onto the port's three words.
 *
 * Compared as strings because `PermissionStatus` lives in `expo-modules-core`, which
 * this file has no other reason to import. An unrecognised status maps to `denied` —
 * the safe reading, since we never schedule into a permission we are unsure of.
 */
function toPermission(status: string): ReminderPermission {
  switch (status) {
    case 'granted':
      return 'granted';
    case 'undetermined':
      return 'undetermined';
    default:
      return 'denied';
  }
}
