/**
 * @fileoverview submitDrillAnswer / submitFlashRating — drill events become
 * persisted progress, feeding the scheduler exactly like a stop.
 *
 * The shape mirrors `submit-answer.ts`: commit to the engine, fold the events,
 * start the write-through. The save is started, never awaited — the caller gets
 * the next state and progress immediately and holds `persisted` for whoever
 * needs the write to have landed.
 *
 * Drills differ from stops in three deliberate ways. All three are adopted
 * decisions dated 2026-08-19, to be recorded in `docs/07-decisions.md` by a
 * later docs pass:
 *
 * A drill's `ended` stamps `walkedOn` and NEVER `completedStops`. A drill
 * completes no stop. The day still counts, because docs/03 §6 reads "days
 * walking: any day with >=1 completed stop/drill/review".
 *
 * Synthesized pair boards carry no per-item identity, so pair-match records
 * nothing per item. This is consistent with §3: a wrong pair shakes, no miss,
 * ever. The engine emits no item event for a null-item exercise, and the fold
 * adds nothing on top.
 *
 * Flashcard ratings map Got it → recordCorrect and Again → recordMiss AT MOST
 * ONCE per item per session, carried by the deck's `firstTime` flag. A learner
 * cycling one card three times in a sitting has slipped once.
 *
 * `taught` is ignored: drills teach nothing, because `met` is only ever reached
 * by being taught in a stop (docs/03 §6). `requeued` and `second-look-added`
 * are queue bookkeeping, ignored here as in the stop path. A re-queued miss
 * missed again folds a second `missed` event, exactly as the sibling does —
 * the scheduler sees what the stop path records, and parity is the rule.
 */

import type {IsoDate} from '../domain/date';
import {newItem, recordCorrect, recordMiss, type ItemId} from '../domain/item';
import {commit, type CommitInput, type SessionEvent} from '../engine/commit';
import {rate, type FlashDeckState, type FlashEvent, type FlashRating} from '../engine/flashcards';
import type {Rng} from '../engine/rng';
import type {SessionState} from '../engine/session';
import type {Progress, ProgressStore} from '../ports/progress-store';

export type SubmitDrillAnswerDeps = {
  readonly store: ProgressStore;
};

export type SubmitDrillAnswerResult = {
  readonly state: SessionState;
  readonly progress: Progress;
  readonly events: readonly SessionEvent[];
  /** Resolves when the started save lands; already resolved when nothing changed. */
  readonly persisted: Promise<void>;
};

export type SubmitFlashRatingResult = {
  readonly state: FlashDeckState;
  readonly progress: Progress;
  readonly events: readonly FlashEvent[];
  /** Resolves when the started save lands; already resolved when nothing changed. */
  readonly persisted: Promise<void>;
};

/**
 * Commit a drill answer and fold the events into progress.
 *
 * Correct and missed carry the injected day into the item's history. The ended
 * event stamps the day walked, and only that — see the fileoverview for the
 * three ways this fold differs from `submitAnswer`.
 */
export async function submitDrillAnswer(
  deps: SubmitDrillAnswerDeps,
  progress: Progress,
  state: SessionState,
  input: CommitInput,
  rng: Rng,
  today: IsoDate,
): Promise<SubmitDrillAnswerResult> {
  const outcome = commit(state, input, rng);
  let next = progress;

  for (const event of outcome.events) {
    switch (event.kind) {
      case 'correct':
        next = withItem(next, event.itemId, item => recordCorrect(item, today));
        break;
      case 'missed':
        next = withItem(next, event.itemId, item => recordMiss(item, today));
        break;
      case 'ended':
        next = withWalkedDay(next, today);
        break;
      case 'taught':
      case 'requeued':
      case 'second-look-added':
        break;
      default:
        assertNever(event);
    }
  }

  const persisted = next !== progress ? deps.store.save(next) : Promise.resolve();
  return {state: outcome.state, progress: next, events: outcome.events, persisted};
}

/**
 * Rate the current flashcard and fold the events into progress.
 *
 * Got it records a correct. Again records a miss only on the deck's first
 * Again for that item this session; later Agains on the same card fold to
 * nothing. The ended event stamps the day walked and never a completed stop.
 */
export async function submitFlashRating(
  deps: SubmitDrillAnswerDeps,
  progress: Progress,
  state: FlashDeckState,
  rating: FlashRating,
  today: IsoDate,
): Promise<SubmitFlashRatingResult> {
  const outcome = rate(state, rating);
  let next = progress;

  for (const event of outcome.events) {
    switch (event.kind) {
      case 'correct':
        next = withItem(next, event.itemId, item => recordCorrect(item, today));
        break;
      case 'again':
        if (event.firstTime) {
          next = withItem(next, event.itemId, item => recordMiss(item, today));
        }
        break;
      case 'ended':
        next = withWalkedDay(next, today);
        break;
      default:
        assertNever(event);
    }
  }

  const persisted = next !== progress ? deps.store.save(next) : Promise.resolve();
  return {state: outcome.state, progress: next, events: outcome.events, persisted};
}

/** Stamp the day walked. `completedStops` is untouched: a drill completes no stop. */
function withWalkedDay(progress: Progress, today: IsoDate): Progress {
  if (progress.walkedOn.includes(today)) {
    return progress;
  }
  return {...progress, walkedOn: [...progress.walkedOn, today]};
}

function withItem(
  progress: Progress,
  itemId: string,
  update: (item: ReturnType<typeof newItem>) => ReturnType<typeof newItem>,
): Progress {
  const existing = progress.items[itemId] ?? newItem(itemId as ItemId);
  const updated = update(existing);
  if (updated === existing) {
    return progress;
  }
  return {...progress, items: {...progress.items, [itemId]: updated}};
}

function assertNever(value: never): never {
  throw new Error(`Unhandled event: ${JSON.stringify(value)}`);
}
