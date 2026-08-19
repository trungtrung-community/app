/**
 * @fileoverview The reminder sync seam, proven against fakes through the container.
 *
 * These tests also stand in for the root layout's effect: the layout is not
 * screen-testable (it loads fonts through a native hook), so what it calls is
 * proven here and the call itself is left to the device pass.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {
  ReminderInstant,
  ReminderPermission,
  ReminderScheduler,
} from '../ports/reminder-scheduler';
import {DEFAULT_SETTINGS, type Settings} from '../ports/settings-store';
import {REMINDER_WINDOW_DAYS} from '../usecases/reminder-plan';

import {override, resetContainer} from './container';
import {reminderStopId, syncReminders} from './notifications';

/** A scheduler that answers a fixed permission and records every schedule call. */
function fakeScheduler(permission: ReminderPermission): {
  scheduler: ReminderScheduler;
  schedules: ReminderInstant[][];
  requestPermission: ReturnType<typeof vi.fn>;
} {
  const schedules: ReminderInstant[][] = [];
  const requestPermission = vi.fn(async () => 'denied' as const);
  const scheduler: ReminderScheduler = {
    getPermission: async () => permission,
    requestPermission,
    replaceSchedule: async instants => {
      schedules.push([...instants]);
    },
    cancelAll: async () => {},
  };
  return {scheduler, schedules, requestPermission};
}

function wireSettings(reminder: Settings['reminder']): void {
  override('settings', {
    load: async () => ({...DEFAULT_SETTINGS, reminder}),
    save: async () => {},
  });
}

beforeEach(() => {
  resetContainer();
});

afterEach(() => {
  resetContainer();
});

describe('syncReminders', () => {
  it('replaces the schedule with the full window when permission is granted', async () => {
    // Given
    const {scheduler, schedules} = fakeScheduler('granted');
    override('reminders', scheduler);
    wireSettings({enabled: true, hour: 19, minute: 0});

    // When
    await syncReminders();

    // Then
    expect(schedules).toHaveLength(1);
    expect(schedules[0]).toHaveLength(REMINDER_WINDOW_DAYS);
    expect(schedules[0]?.[0]?.at).toMatch(/T19:00:00$/);
  });

  it('schedules nothing when permission is denied', async () => {
    // Given
    const {scheduler, schedules} = fakeScheduler('denied');
    override('reminders', scheduler);
    wireSettings({enabled: true, hour: 19, minute: 0});

    // When
    await syncReminders();

    // Then
    expect(schedules).toHaveLength(0);
  });

  it('never asks for permission while undetermined', async () => {
    // Given
    const {scheduler, schedules, requestPermission} = fakeScheduler('undetermined');
    override('reminders', scheduler);
    wireSettings({enabled: true, hour: 19, minute: 0});

    // When
    await syncReminders();

    // Then
    expect(schedules).toHaveLength(0);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it('replaces the schedule with an empty window when the reminder is off', async () => {
    // A disabled reminder still goes through `replaceSchedule` — the port defines
    // an empty replace as cancel-then-schedule-nothing, so one code path both
    // plans and clears, and a stale window cannot outlive the toggle.

    // Given
    const {scheduler, schedules} = fakeScheduler('granted');
    override('reminders', scheduler);
    wireSettings({enabled: false, hour: 19, minute: 0});

    // When
    await syncReminders();

    // Then
    expect(schedules).toEqual([[]]);
  });
});

describe('reminderStopId', () => {
  it('reads the stop id a response carries', () => {
    // Given
    const response = {notification: {request: {content: {data: {stopId: 'stop.core.c1.1'}}}}};

    // Then
    expect(reminderStopId(response)).toBe('stop.core.c1.1');
  });

  it('answers null for the plain daily line', () => {
    // Given
    const response = {notification: {request: {content: {}}}};

    // Then
    expect(reminderStopId(response)).toBeNull();
  });

  it('answers null when the payload is not a stop id', () => {
    // Given
    const response = {notification: {request: {content: {data: {stopId: 7}}}}};

    // Then
    expect(reminderStopId(response)).toBeNull();
  });
});
