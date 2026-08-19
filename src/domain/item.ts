/**
 * @fileoverview The progression model: how an item moves from new to known, and
 * when it comes back.
 *
 * `docs/03-exercise-system.md` §6 is the authority, quoted verbatim:
 *
 * > Item states: `new` -> `met` (taught in a stop) -> `known` (correct in two
 * > different sessions on two different days). Due: intervals 1, 3, 7, 21, 60
 * > days. A miss steps back one notch, never to zero. Worth another look: missed
 * > >=2 in the last 7 days. Days walking: any day with >=1 completed
 * > stop/drill/review. Cumulative.
 *
 * Three things in that paragraph are easy to get wrong, and all three are
 * deliberate here:
 *
 * `met` is reached by being TAUGHT in a stop, not by answering correctly. A
 * learner meets a word when the app presents it.
 *
 * There is no state demotion. A miss steps back the review INTERVAL; the state
 * never falls. There is no known -> met and no met -> new.
 *
 * `known` cannot be decided from a state and a boolean, because it needs the
 * distinct days on which the item was answered correctly. That is why the record
 * carries the days rather than a counter.
 *
 * No number in this model is ever shown as a score, and no interval is ever shown
 * at all — see `docs/01-vision.md`.
 */

import {addDays, daysBetween, type IsoDate} from './date';

/** Days between reviews once an item is known. Index 0 is the first review. */
export const REVIEW_INTERVALS = [1, 3, 7, 21, 60] as const;

/** How many days back "worth another look" looks. */
export const WORTH_ANOTHER_LOOK_WINDOW_DAYS = 7;

/** How many misses inside that window earn the label. */
export const WORTH_ANOTHER_LOOK_MISSES = 2;

/** Corrects on distinct days needed to become known. */
export const DAYS_TO_KNOWN = 2;

/**
 * What the learner has done with one item.
 *
 * The status dot renders hollow, grey or teal for these three, and always carries
 * a text equivalent nearby because colour alone is not a signal.
 */
export type ItemState = 'new' | 'met' | 'known';

/**
 * What progress is keyed on, and eventually persisted under in MMKV.
 *
 * An `ItemId` is a `VocabId` or a phrase id. Vocabulary ids stopped naming a
 * district on 2026-08-18 precisely so this could be safe to persist: identity
 * used to be a function of curriculum placement, so moving a word between
 * districts renamed it, and the expansion draft alone resolved to eight moves.
 * `validate.py` rules 30-32 now hold the id to its slug, hold the slug unique,
 * and refuse any rename that is not recorded in `content/id-history.json`.
 *
 * `ContentItemId` in `src/ports/content-ids.ts` is a subtype of this, so every
 * vocabulary and phrase id is an `ItemId` with no cast. The dependency points from
 * ports to domain; this file knows nothing about content.
 */
export type ItemId = string & {readonly __brand: 'ItemId'};

/**
 * One item's history, carrying the evidence the rules need rather than summaries
 * of it.
 *
 * `correctOn` and `missedOn` hold distinct days, ascending. Keeping the days is
 * what lets "two different days" and "missed twice in the last 7" be decided at
 * all; a pair of counters could answer neither.
 */
export type ItemProgress = {
  readonly itemId: ItemId;
  readonly state: ItemState;
  /** Distinct days the item was answered correctly, ascending. */
  readonly correctOn: readonly IsoDate[];
  /** Distinct days the item was missed, ascending. */
  readonly missedOn: readonly IsoDate[];
  /**
   * Position on REVIEW_INTERVALS. Meaningful only once the item is known;
   * a miss decrements it and it never resets.
   */
  readonly intervalIndex: number;
  /** The day this item next comes up, or null while it is not yet known. */
  readonly dueOn: IsoDate | null;
};

/** A fresh item, never presented to the learner. */
export function newItem(itemId: ItemId): ItemProgress {
  return {itemId, state: 'new', correctOn: [], missedOn: [], intervalIndex: 0, dueOn: null};
}

/**
 * The learner has been taught this item in a stop.
 *
 * This is the ONLY way to reach `met`. Answering correctly does not do it, and a
 * `met` or `known` item is left alone — being taught again is not a regression.
 */
export function markTaught(item: ItemProgress): ItemProgress {
  return item.state === 'new' ? {...item, state: 'met'} : item;
}

/**
 * Record a correct answer or a positive self-rating on `on`.
 *
 * Reaching `known` needs corrects on two distinct days, so answering twice in one
 * sitting does not get there. Once known, the item advances one notch up the
 * interval ladder and is scheduled from `on`.
 */
export function recordCorrect(item: ItemProgress, on: IsoDate): ItemProgress {
  const correctOn = withDay(item.correctOn, on);
  const known = correctOn.length >= DAYS_TO_KNOWN;

  if (!known) {
    // Still short of two days. A correct answer never skips `met`, because a
    // learner cannot have answered an item they were never taught.
    return {...item, state: item.state === 'new' ? 'met' : item.state, correctOn};
  }

  // Already known items climb; the item that just became known starts at index 0.
  const intervalIndex =
    item.state === 'known' ? Math.min(item.intervalIndex + 1, REVIEW_INTERVALS.length - 1) : 0;

  return {
    ...item,
    state: 'known',
    correctOn,
    intervalIndex,
    dueOn: addDays(on, intervalAt(intervalIndex)),
  };
}

/**
 * Record a miss on `on`.
 *
 * The interval steps back exactly one notch and never resets — a learner who
 * slips on a long-held word should not be dragged back to the beginning. The item
 * STATE does not change: nothing in the model demotes.
 */
export function recordMiss(item: ItemProgress, on: IsoDate): ItemProgress {
  const missedOn = withDay(item.missedOn, on);

  if (item.state !== 'known') {
    // Not on the ladder yet, so there is no interval to step back.
    return {...item, missedOn};
  }

  const intervalIndex = Math.max(item.intervalIndex - 1, 0);
  return {...item, missedOn, intervalIndex, dueOn: addDays(on, intervalAt(intervalIndex))};
}

/** Whether the item comes up on `today`. Only known items are ever due. */
export function isDue(item: ItemProgress, today: IsoDate): boolean {
  return item.dueOn !== null && daysBetween(item.dueOn, today) >= 0;
}

/**
 * Whether the item belongs on the summary's "worth another look" list.
 *
 * The label is about recent trouble, so it counts misses inside a moving window
 * rather than over all time. Copy never says "failed" or "keep missing".
 */
export function isWorthAnotherLook(item: ItemProgress, today: IsoDate): boolean {
  const recent = item.missedOn.filter(
    day => daysBetween(day, today) < WORTH_ANOTHER_LOOK_WINDOW_DAYS,
  );
  return recent.length >= WORTH_ANOTHER_LOOK_MISSES;
}

/** The interval in days at a ladder position, clamped into range. */
export function intervalAt(index: number): number {
  const clamped = Math.min(Math.max(index, 0), REVIEW_INTERVALS.length - 1);
  return REVIEW_INTERVALS[clamped] as number;
}

/**
 * Counts for the status line, e.g. "19 known · 4 met · 1 not yet".
 *
 * Every colour-coded status in the product carries this text equivalent, so the
 * counts are part of the model rather than a view concern.
 */
export function countByState(items: readonly ItemProgress[]): Record<ItemState, number> {
  const counts: Record<ItemState, number> = {new: 0, met: 0, known: 0};
  for (const item of items) {
    counts[item.state]++;
  }
  return counts;
}

/** Append a day if it is not already recorded, keeping the list ascending. */
function withDay(days: readonly IsoDate[], day: IsoDate): readonly IsoDate[] {
  return days.includes(day) ? days : [...days, day].sort();
}
