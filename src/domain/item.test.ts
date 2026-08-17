/**
 * @fileoverview The progression model, stated as behaviours.
 *
 * `docs/06-testing.md` §2 already wrote these as Gherkin, and `docs/03` §6 is the
 * binding paragraph. Each test names the rule it defends, so a future change to
 * the model has to argue with the spec rather than with an assertion.
 *
 * No doubles and no fake timers: every rule takes the day as an argument.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {describe, expect, it} from 'vitest';

import {isoDate} from './date';
import {
  DAYS_TO_KNOWN,
  REVIEW_INTERVALS,
  countByState,
  intervalAt,
  isDue,
  isWorthAnotherLook,
  markTaught,
  newItem,
  recordCorrect,
  recordMiss,
  type ItemId,
} from './item';

const ITEM = 'vocab.core.tashi-delek' as ItemId;
const DAY_1 = isoDate('2026-08-17');
const DAY_2 = isoDate('2026-08-18');
const DAY_3 = isoDate('2026-08-19');

/** A known item, reached the only way the spec allows: taught, then two days. */
function knownItem() {
  return recordCorrect(recordCorrect(markTaught(newItem(ITEM)), DAY_1), DAY_2);
}

describe('reaching met', () => {
  it('starts new, with nothing due', () => {
    // Given
    const id = ITEM;

    // When
    const item = newItem(id);

    // Then
    expect(item.state).toBe('new');
    expect(item.dueOn).toBeNull();
  });

  it('becomes met when taught in a stop', () => {
    // Given
    const item = newItem(ITEM);

    // When
    const taught = markTaught(item);

    // Then
    expect(taught.state).toBe('met');
  });

  it('does not fall back to new when taught again', () => {
    // Given
    const met = markTaught(newItem(ITEM));

    // When
    const again = markTaught(met);

    // Then
    expect(again.state).toBe('met');
  });
});

describe('reaching known', () => {
  it('needs correct answers on two different days', () => {
    // Given
    const met = markTaught(newItem(ITEM));

    // When
    const once = recordCorrect(met, DAY_1);
    const twice = recordCorrect(once, DAY_2);

    // Then
    expect(once.state).toBe('met');
    expect(twice.state).toBe('known');
  });

  it('does not become known from two corrects on the same day', () => {
    // Given
    const met = markTaught(newItem(ITEM));

    // When
    const item = recordCorrect(recordCorrect(met, DAY_1), DAY_1);

    // Then
    expect(item.state).toBe('met');
    expect(item.correctOn).toEqual([DAY_1]);
  });

  it('needs exactly DAYS_TO_KNOWN distinct days', () => {
    // Given
    const required = DAYS_TO_KNOWN;

    // When
    const item = knownItem();

    // Then
    expect(item.correctOn).toHaveLength(required);
  });

  it('is due one day after becoming known', () => {
    // Given
    const once = recordCorrect(markTaught(newItem(ITEM)), DAY_1);

    // When
    const known = recordCorrect(once, DAY_2);

    // Then — the ladder starts at its first notch, which is 1 day.
    expect(known.dueOn).toBe(isoDate('2026-08-19'));
    expect(intervalAt(0)).toBe(1);
  });
});

describe('the interval ladder', () => {
  it('climbs one notch per correct answer', () => {
    // Given
    let item = knownItem();
    expect(item.intervalIndex).toBe(0);

    // Then — the act and the assertion are one step here, repeated per notch.
    for (let i = 1; i < REVIEW_INTERVALS.length; i++) {
      item = recordCorrect(item, isoDate(`2026-09-0${i}`));
      expect(item.intervalIndex).toBe(i);
    }
  });

  it('stops climbing at the last notch', () => {
    // Given
    let item = knownItem();

    // When
    for (let i = 0; i < REVIEW_INTERVALS.length + 3; i++) {
      item = recordCorrect(item, isoDate(`2026-1${Math.floor(i / 9)}-0${(i % 9) + 1}`));
    }

    // Then
    expect(item.intervalIndex).toBe(REVIEW_INTERVALS.length - 1);
    expect(intervalAt(item.intervalIndex)).toBe(60);
  });

  it('steps back one notch on a miss, never to zero', () => {
    // Given — climbed to the 7-day notch.
    let item = knownItem();
    item = recordCorrect(item, DAY_3);
    item = recordCorrect(item, isoDate('2026-08-25'));
    expect(intervalAt(item.intervalIndex)).toBe(7);

    // When
    item = recordMiss(item, isoDate('2026-09-01'));

    // Then
    expect(intervalAt(item.intervalIndex)).toBe(3);
    expect(item.intervalIndex).not.toBe(0);
  });

  it('holds at the first notch when missed there', () => {
    // Given
    const known = knownItem();
    expect(known.intervalIndex).toBe(0);

    // When
    const item = recordMiss(known, DAY_3);

    // Then
    expect(item.intervalIndex).toBe(0);
    expect(intervalAt(item.intervalIndex)).toBe(1);
  });
});

describe('no state demotion', () => {
  it('keeps a known item known after a miss', () => {
    // Given
    const known = knownItem();

    // When
    const missed = recordMiss(known, DAY_3);

    // Then — a miss moves the interval, never the state.
    expect(missed.state).toBe('known');
  });

  it('keeps a met item met after a miss', () => {
    // Given
    const met = markTaught(newItem(ITEM));

    // When
    const missed = recordMiss(met, DAY_1);

    // Then
    expect(missed.state).toBe('met');
  });

  it('leaves a not-yet-known item off the ladder when missed', () => {
    // Given
    const met = markTaught(newItem(ITEM));

    // When
    const missed = recordMiss(met, DAY_1);

    // Then
    expect(missed.dueOn).toBeNull();
  });
});

describe('due', () => {
  it('is not due before its day', () => {
    // Given — known on DAY_2, so due DAY_3.
    const item = knownItem();

    // When
    const due = isDue(item, DAY_2);

    // Then
    expect(due).toBe(false);
  });

  it('is due on its day', () => {
    // Given
    const item = knownItem();

    // When
    const due = isDue(item, DAY_3);

    // Then
    expect(due).toBe(true);
  });

  it('is still due once the day has passed', () => {
    // Given
    const item = knownItem();

    // When
    const due = isDue(item, isoDate('2026-09-30'));

    // Then — an unanswered review does not expire.
    expect(due).toBe(true);
  });

  it('is never due while not yet known', () => {
    // Given
    const met = markTaught(newItem(ITEM));

    // When
    const due = isDue(met, DAY_3);

    // Then — the ladder starts at known.
    expect(due).toBe(false);
  });
});

describe('worth another look', () => {
  it('needs two misses inside the last seven days', () => {
    // Given
    let item = markTaught(newItem(ITEM));
    item = recordMiss(item, isoDate('2026-08-15'));
    expect(isWorthAnotherLook(item, isoDate('2026-08-17'))).toBe(false);

    // When
    item = recordMiss(item, isoDate('2026-08-16'));

    // Then
    expect(isWorthAnotherLook(item, isoDate('2026-08-17'))).toBe(true);
  });

  it('forgets misses older than the window', () => {
    // Given
    let item = markTaught(newItem(ITEM));
    item = recordMiss(item, isoDate('2026-08-01'));
    item = recordMiss(item, isoDate('2026-08-02'));

    // When
    const worth = isWorthAnotherLook(item, isoDate('2026-08-20'));

    // Then
    expect(worth).toBe(false);
  });

  it('counts a repeat miss on one day only once', () => {
    // Given
    let item = markTaught(newItem(ITEM));

    // When
    item = recordMiss(item, DAY_1);
    item = recordMiss(item, DAY_1);

    // Then
    expect(item.missedOn).toEqual([DAY_1]);
    expect(isWorthAnotherLook(item, DAY_1)).toBe(false);
  });
});

describe('the status line', () => {
  it('counts every state, so the colour dot always has a text equivalent', () => {
    // Given
    const items = [
      newItem('a' as ItemId),
      markTaught(newItem('b' as ItemId)),
      markTaught(newItem('c' as ItemId)),
      knownItem(),
    ];

    // When
    const counts = countByState(items);

    // Then
    expect(counts).toEqual({new: 1, met: 2, known: 1});
  });
});
