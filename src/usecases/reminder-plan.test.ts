/**
 * @fileoverview The reminder window's rules — docs/07 (2026-08-04, N1).
 *
 * The 60-day silence is not asserted as behaviour over time; it is the length of the
 * plan. These tests pin that length, the start-day boundary, and the wall-clock
 * formatting the adapter depends on.
 */

import {describe, expect, it} from 'vitest';

import {isoDate} from '../domain/date';

import {planReminders, REMINDER_COPY, REMINDER_WINDOW_DAYS} from './reminder-plan';

const TODAY = isoDate('2026-08-19');

function reminder(hour: number, minute: number, enabled = true) {
  return {enabled, hour, minute};
}

describe('planReminders', () => {
  it('plans nothing while the reminder is off', () => {
    // When
    const plan = planReminders({reminder: reminder(19, 0, false), today: TODAY, now: 600});

    // Then
    expect(plan).toEqual([]);
  });

  it('plans exactly the 60-day window', () => {
    // When
    const plan = planReminders({reminder: reminder(19, 0), today: TODAY, now: 600});

    // Then
    expect(REMINDER_WINDOW_DAYS).toBe(60);
    expect(plan).toHaveLength(60);
  });

  it('starts today while the chosen time is still ahead', () => {
    // Given
    // 10:00, with the reminder set for 19:00.
    const now = 10 * 60;

    // When
    const plan = planReminders({reminder: reminder(19, 0), today: TODAY, now});

    // Then
    expect(plan[0]?.at).toBe('2026-08-19T19:00:00');
  });

  it('starts tomorrow once the chosen time has passed', () => {
    // Given
    // 21:30, with the reminder set for 19:00.
    const now = 21 * 60 + 30;

    // When
    const plan = planReminders({reminder: reminder(19, 0), today: TODAY, now});

    // Then
    expect(plan[0]?.at).toBe('2026-08-20T19:00:00');
  });

  it('starts tomorrow at the exact chosen minute, never firing on the spot', () => {
    // Given
    const now = 19 * 60;

    // When
    const plan = planReminders({reminder: reminder(19, 0), today: TODAY, now});

    // Then
    expect(plan[0]?.at).toBe('2026-08-20T19:00:00');
  });

  it('honours the chosen hour and minute, zero-padded', () => {
    // When
    const plan = planReminders({reminder: reminder(7, 5), today: TODAY, now: 0});

    // Then
    expect(plan[0]?.at).toBe('2026-08-19T07:05:00');
  });

  it('plans consecutive days with no gaps', () => {
    // When
    const plan = planReminders({reminder: reminder(19, 0), today: TODAY, now: 0});

    // Then
    const days = plan.map(instant => instant.at.slice(0, 10));
    expect(days[0]).toBe('2026-08-19');
    expect(days[59]).toBe('2026-10-17');
    expect(new Set(days).size).toBe(60);
    for (let index = 1; index < days.length; index += 1) {
      const previous = days[index - 1] ?? '';
      const current = days[index] ?? '';
      expect(current > previous).toBe(true);
    }
  });

  it('carries the one daily line, with no stop named yet', () => {
    // When
    const plan = planReminders({reminder: reminder(19, 0), today: TODAY, now: 0});

    // Then
    for (const instant of plan) {
      expect(instant.title).toBe(REMINDER_COPY.title);
      expect(instant.body).toBe(REMINDER_COPY.body);
      expect(instant.stopId).toBeNull();
    }
  });
});
