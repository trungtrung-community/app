/**
 * @fileoverview The progression model, stated as behaviours.
 *
 * `docs/06-testing.md` §2 already wrote these as Gherkin, and `docs/03` §6 is the
 * binding paragraph. Each test names the rule it defends, so a future change to
 * the model has to argue with the spec rather than with an assertion.
 *
 * No doubles and no fake timers: every rule takes the day as an argument.
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
    const item = newItem(ITEM);
    expect(item.state).toBe('new');
    expect(item.dueOn).toBeNull();
  });

  it('becomes met when taught in a stop', () => {
    expect(markTaught(newItem(ITEM)).state).toBe('met');
  });

  it('does not fall back to new when taught again', () => {
    expect(markTaught(markTaught(newItem(ITEM))).state).toBe('met');
  });
});

describe('reaching known', () => {
  it('needs correct answers on two different days', () => {
    const once = recordCorrect(markTaught(newItem(ITEM)), DAY_1);
    expect(once.state).toBe('met');

    const twice = recordCorrect(once, DAY_2);
    expect(twice.state).toBe('known');
  });

  it('does not become known from two corrects on the same day', () => {
    const item = recordCorrect(recordCorrect(markTaught(newItem(ITEM)), DAY_1), DAY_1);
    expect(item.state).toBe('met');
    expect(item.correctOn).toEqual([DAY_1]);
  });

  it('needs exactly DAYS_TO_KNOWN distinct days', () => {
    expect(knownItem().correctOn).toHaveLength(DAYS_TO_KNOWN);
  });

  it('is due one day after becoming known', () => {
    // The ladder starts at its first notch, which is 1 day.
    expect(knownItem().dueOn).toBe(isoDate('2026-08-19'));
    expect(intervalAt(0)).toBe(1);
  });
});

describe('the interval ladder', () => {
  it('climbs one notch per correct answer', () => {
    let item = knownItem();
    expect(item.intervalIndex).toBe(0);

    for (let i = 1; i < REVIEW_INTERVALS.length; i++) {
      item = recordCorrect(item, isoDate(`2026-09-0${i}`));
      expect(item.intervalIndex).toBe(i);
    }
  });

  it('stops climbing at the last notch', () => {
    let item = knownItem();
    for (let i = 0; i < REVIEW_INTERVALS.length + 3; i++) {
      item = recordCorrect(item, isoDate(`2026-1${Math.floor(i / 9)}-0${(i % 9) + 1}`));
    }
    expect(item.intervalIndex).toBe(REVIEW_INTERVALS.length - 1);
    expect(intervalAt(item.intervalIndex)).toBe(60);
  });

  it('steps back one notch on a miss, never to zero', () => {
    // Climb to the 7-day notch, then miss once.
    let item = knownItem();
    item = recordCorrect(item, DAY_3);
    item = recordCorrect(item, isoDate('2026-08-25'));
    expect(intervalAt(item.intervalIndex)).toBe(7);

    item = recordMiss(item, isoDate('2026-09-01'));
    expect(intervalAt(item.intervalIndex)).toBe(3);
    expect(item.intervalIndex).not.toBe(0);
  });

  it('holds at the first notch when missed there', () => {
    const item = recordMiss(knownItem(), DAY_3);
    expect(item.intervalIndex).toBe(0);
    expect(intervalAt(item.intervalIndex)).toBe(1);
  });
});

describe('no state demotion', () => {
  it('keeps a known item known after a miss', () => {
    expect(recordMiss(knownItem(), DAY_3).state).toBe('known');
  });

  it('keeps a met item met after a miss', () => {
    expect(recordMiss(markTaught(newItem(ITEM)), DAY_1).state).toBe('met');
  });

  it('leaves a not-yet-known item off the ladder when missed', () => {
    const item = recordMiss(markTaught(newItem(ITEM)), DAY_1);
    expect(item.dueOn).toBeNull();
  });
});

describe('due', () => {
  it('is not due before its day', () => {
    // Known on DAY_2, so due DAY_3.
    expect(isDue(knownItem(), DAY_2)).toBe(false);
  });

  it('is due on its day', () => {
    expect(isDue(knownItem(), DAY_3)).toBe(true);
  });

  it('is still due once the day has passed', () => {
    expect(isDue(knownItem(), isoDate('2026-09-30'))).toBe(true);
  });

  it('is never due while not yet known', () => {
    expect(isDue(markTaught(newItem(ITEM)), DAY_3)).toBe(false);
  });
});

describe('worth another look', () => {
  it('needs two misses inside the last seven days', () => {
    let item = markTaught(newItem(ITEM));
    item = recordMiss(item, isoDate('2026-08-15'));
    expect(isWorthAnotherLook(item, isoDate('2026-08-17'))).toBe(false);

    item = recordMiss(item, isoDate('2026-08-16'));
    expect(isWorthAnotherLook(item, isoDate('2026-08-17'))).toBe(true);
  });

  it('forgets misses older than the window', () => {
    let item = markTaught(newItem(ITEM));
    item = recordMiss(item, isoDate('2026-08-01'));
    item = recordMiss(item, isoDate('2026-08-02'));
    expect(isWorthAnotherLook(item, isoDate('2026-08-20'))).toBe(false);
  });

  it('counts a repeat miss on one day only once', () => {
    let item = markTaught(newItem(ITEM));
    item = recordMiss(item, DAY_1);
    item = recordMiss(item, DAY_1);
    expect(item.missedOn).toEqual([DAY_1]);
    expect(isWorthAnotherLook(item, DAY_1)).toBe(false);
  });
});

describe('the status line', () => {
  it('counts every state, so the colour dot always has a text equivalent', () => {
    const items = [
      newItem('a' as ItemId),
      markTaught(newItem('b' as ItemId)),
      markTaught(newItem('c' as ItemId)),
      knownItem(),
    ];
    expect(countByState(items)).toEqual({new: 1, met: 2, known: 1});
  });
});
