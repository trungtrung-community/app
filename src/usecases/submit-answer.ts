/**
 * @fileoverview submitAnswer — commit to the engine, fold the events into
 * progress, write through.
 *
 * The engine states what happened; this is the one place that decides what it
 * means for the record: taught marks `met`, correct and missed carry the injected
 * day into the item's history, and the ended event stamps the day walked and the
 * stop completed. The clock arrives as a value, like the engine's rng.
 */

import type {IsoDate} from '../domain/date';
import {markTaught, newItem, recordCorrect, recordMiss, type ItemId} from '../domain/item';
import {commit, type CommitInput, type SessionEvent} from '../engine/commit';
import type {Rng} from '../engine/rng';
import type {SessionState} from '../engine/session';
import type {Progress, ProgressStore} from '../ports/progress-store';

export type SubmitAnswerDeps = {
  readonly store: ProgressStore;
};

export type SubmitAnswerResult = {
  readonly state: SessionState;
  readonly progress: Progress;
  readonly events: readonly SessionEvent[];
};

export async function submitAnswer(
  deps: SubmitAnswerDeps,
  progress: Progress,
  state: SessionState,
  input: CommitInput,
  rng: Rng,
  today: IsoDate,
): Promise<SubmitAnswerResult> {
  const outcome = commit(state, input, rng);
  let next = progress;

  for (const event of outcome.events) {
    switch (event.kind) {
      case 'taught':
        next = withItem(next, event.itemId, item => markTaught(item));
        break;
      case 'correct':
        next = withItem(next, event.itemId, item => recordCorrect(item, today));
        break;
      case 'missed':
        next = withItem(next, event.itemId, item => recordMiss(item, today));
        break;
      case 'ended':
        next = {
          ...next,
          walkedOn: next.walkedOn.includes(today) ? next.walkedOn : [...next.walkedOn, today],
          completedStops: next.completedStops.includes(state.stopId)
            ? next.completedStops
            : [...next.completedStops, state.stopId],
        };
        break;
      case 'requeued':
      case 'second-look-added':
        break;
      default:
        assertNever(event);
    }
  }

  if (next !== progress) {
    await deps.store.save(next);
  }
  return {state: outcome.state, progress: next, events: outcome.events};
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
