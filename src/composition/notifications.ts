/**
 * @fileoverview The reminder wiring the root layout calls — and nothing else does.
 *
 * Two jobs live here because both need the container and neither may leak
 * `expo-notifications` into `app/**`: keeping the scheduled window in step with the
 * learner's settings, and turning a notification tap into a route. The pure planning
 * lives in `../usecases/reminder-plan`; this file is where the clock is read and the
 * adapters are reached, which is exactly what `src/composition/` is for — the same
 * layering `cue.ts` set.
 */

import {Platform} from 'react-native';

import {isoDate, type IsoDate} from '../domain/date';
import {planReminders} from '../usecases/reminder-plan';

import {reminders, settings} from './container';

/**
 * Bring the pending reminder window in step with the learner's settings.
 *
 * Called on every launch and foreground. Reads settings through the container's
 * store rather than the zustand slice, so it works before any UI has hydrated.
 *
 * Does nothing unless permission is already `granted` — this function never asks;
 * the one system prompt belongs to the O4/N3 flows. Until they grant, there is
 * nothing pending to correct either, so skipping is not a leak.
 *
 * A disabled reminder still calls `replaceSchedule` — with the planner's empty
 * plan, which the port defines as cancel-then-schedule-nothing. One code path
 * whatever the toggle says, and a learner who turns the reminder off has their
 * stale window cleared on the next foreground even if the toggle's own
 * `cancelAll` never ran.
 */
export async function syncReminders(): Promise<void> {
  const scheduler = await reminders();
  if ((await scheduler.getPermission()) !== 'granted') {
    return;
  }
  const {reminder} = await (await settings()).load();
  const clock = new Date();
  await scheduler.replaceSchedule(
    planReminders({reminder, today: localToday(clock), now: localMinute(clock)}),
  );
}

/**
 * The stop id a notification response carries, or null for the plain daily line.
 *
 * Exported for the seam's own tests: the response object is the only part of the
 * tap flow with rules in it, and this keeps those rules provable in a node run.
 */
export function reminderStopId(response: {
  notification: {request: {content: {data?: unknown}}};
}): string | null {
  const data = response.notification.request.content.data;
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const stopId = (data as {stopId?: unknown}).stopId;
  return typeof stopId === 'string' ? stopId : null;
}

/**
 * Deliver every reminder tap to `handler`, live and cold-start alike.
 *
 * The live listener only hears taps while the app is running; a tap that *launched*
 * the app is parked in `getLastNotificationResponseAsync` instead. Both are the same
 * gesture to the learner, so both arrive here — the parked one is cleared after
 * delivery, and responses are deduplicated by request identifier because Android may
 * hand the launch response to the live listener as well.
 *
 * `expo-notifications` is reached by dynamic import for the container's reason: a
 * module that subscribes must not make every importer load the native module. On web
 * this is a no-op — the silent scheduler's counterpart.
 *
 * @returns Unsubscribe. Safe to call before the import resolves.
 */
export function onReminderResponse(handler: (stopId: string | null) => void): () => void {
  if (Platform.OS === 'web') {
    return () => {};
  }
  let removed = false;
  let subscription: {remove(): void} | null = null;
  let deliveredId: string | null = null;

  const deliver = (response: {
    notification: {request: {identifier: string; content: {data?: unknown}}};
  }): void => {
    if (removed || response.notification.request.identifier === deliveredId) {
      return;
    }
    deliveredId = response.notification.request.identifier;
    handler(reminderStopId(response));
  };

  void import('expo-notifications')
    .then(async notifications => {
      if (removed) {
        return;
      }
      subscription = notifications.addNotificationResponseReceivedListener(deliver);
      const launch = await notifications.getLastNotificationResponseAsync();
      if (launch !== null && !removed) {
        await notifications.clearLastNotificationResponseAsync();
        deliver(launch);
      }
    })
    .catch(() => {
      // A missing notification module loses only the deep link, never the app.
    });

  return () => {
    removed = true;
    subscription?.remove();
  };
}

/**
 * The device's local calendar day.
 *
 * Deliberately not `toIsoDate`, which reads the day in UTC for the progression
 * rules. A reminder is wall-clock — "19:00" means the learner's evening wherever
 * they are — so its "today" must be the local one, or a plan made late at night
 * lands a day off.
 */
function localToday(clock: Date): IsoDate {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return isoDate(`${clock.getFullYear()}-${pad(clock.getMonth() + 1)}-${pad(clock.getDate())}`);
}

/** Minutes since local midnight, the planner's `now`. */
function localMinute(clock: Date): number {
  return clock.getHours() * 60 + clock.getMinutes();
}
