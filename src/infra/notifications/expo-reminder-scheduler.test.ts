/**
 * @fileoverview The adapter's translation duties, against a mocked `expo-notifications`.
 *
 * A mock rather than a fake, unlike `device-cue-player.test.ts` — deliberately. The
 * cue player has rules of its own worth testing through behaviour; this adapter has
 * none. Its whole job is translation — port call to module call, status word to
 * status word, wall-clock string to `Date` — and translation is exactly what
 * call-shape assertions are for.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {NotificationPermissionsStatus} from 'expo-notifications';

import type {ReminderInstant} from '../../ports/reminder-scheduler';

import {ExpoReminderScheduler} from './expo-reminder-scheduler';

vi.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: {DATE: 'date'},
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn().mockResolvedValue('id'),
  cancelAllScheduledNotificationsAsync: vi.fn().mockResolvedValue(undefined),
}));

const Notifications = vi.mocked(await import('expo-notifications'));

/** Only `status` matters to the adapter; the response's other fields are noise here. */
function response(status: 'granted' | 'denied' | 'undetermined'): NotificationPermissionsStatus {
  return {status} as unknown as NotificationPermissionsStatus;
}

function instant(overrides: Partial<ReminderInstant> = {}): ReminderInstant {
  return {
    at: '2026-08-19T19:00:00',
    title: 'Trungtrung',
    body: 'A quiet walk through Lhasa is ready when you are.',
    stopId: null,
    ...overrides,
  };
}

describe('ExpoReminderScheduler', () => {
  const scheduler = new ExpoReminderScheduler();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('replaceSchedule', () => {
    it('cancels everything pending before scheduling the new window', async () => {
      // When
      await scheduler.replaceSchedule([instant(), instant({at: '2026-08-20T19:00:00'})]);

      // Then
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
      const cancelOrder =
        Notifications.cancelAllScheduledNotificationsAsync.mock.invocationCallOrder[0];
      const firstScheduleOrder =
        Notifications.scheduleNotificationAsync.mock.invocationCallOrder[0];
      // A missing cancel order coalesces to Infinity, so the assertion still fails.
      expect(firstScheduleOrder).toBeGreaterThan(cancelOrder ?? Number.POSITIVE_INFINITY);
    });

    it('schedules a one-off date trigger at the local wall-clock instant', async () => {
      // When
      await scheduler.replaceSchedule([instant()]);

      // Then
      // `new Date` on the offset-less string is device-local — the port's meaning.
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Trungtrung',
          body: 'A quiet walk through Lhasa is ready when you are.',
        },
        trigger: {type: 'date', date: new Date('2026-08-19T19:00:00')},
      });
    });

    it('carries the stop in content.data when one is named', async () => {
      // When
      await scheduler.replaceSchedule([instant({stopId: 'stop.core.c1.1'})]);

      // Then
      const request = Notifications.scheduleNotificationAsync.mock.calls[0]?.[0];
      expect(request?.content.data).toEqual({stopId: 'stop.core.c1.1'});
    });

    it('omits content.data entirely for the plain daily line', async () => {
      // When
      await scheduler.replaceSchedule([instant({stopId: null})]);

      // Then
      const request = Notifications.scheduleNotificationAsync.mock.calls[0]?.[0];
      expect(request).toBeDefined();
      expect(request?.content).not.toHaveProperty('data');
    });
  });

  describe('permission mapping', () => {
    it.each(['granted', 'denied', 'undetermined'] as const)(
      'reads %s back as itself',
      async status => {
        // Given
        Notifications.getPermissionsAsync.mockResolvedValue(response(status));

        // When
        const permission = await scheduler.getPermission();

        // Then
        expect(permission).toBe(status);
      },
    );

    it('maps a granted request to granted', async () => {
      // Given
      Notifications.requestPermissionsAsync.mockResolvedValue(response('granted'));

      // When
      const permission = await scheduler.requestPermission();

      // Then
      expect(permission).toBe('granted');
    });

    it('maps anything else a request answers to denied', async () => {
      // Given
      // iOS answers a repeat ask with the standing status, never a new dialog.
      Notifications.requestPermissionsAsync.mockResolvedValue(response('undetermined'));

      // When
      const permission = await scheduler.requestPermission();

      // Then
      expect(permission).toBe('denied');
    });
  });

  describe('cancelAll', () => {
    it('clears the pending window', async () => {
      // When
      await scheduler.cancelAll();

      // Then
      expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    });
  });
});
