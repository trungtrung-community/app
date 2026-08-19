/**
 * @fileoverview The named case from docs/11 §2: the learner submits the final
 * answer; does the use case advance the engine and persist progress?
 *
 * Real fixture, real JSON adapter, a memory ProgressStore, a seeded rng — the
 * whole loop with no doubles inside the boundary. Phases per docs/11.
 */

import {describe, expect, it} from 'vitest';

import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';

import {isoDate} from '../../src/domain/date';
import {seededRng} from '../../src/engine/rng';
import type {SessionState} from '../../src/engine/session';
import type {CommitInput} from '../../src/engine/commit';
import type {StopId} from '../../src/ports/content-ids';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';
import {startStop} from '../../src/usecases/start-stop';
import {submitAnswer} from '../../src/usecases/submit-answer';

const STOP_ID = 'stop.core.c1.1' as StopId;
const TODAY = isoDate('2026-08-19');
const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

function memoryStore(): ProgressStore & {saved: () => Progress | null} {
  let last: Progress | null = null;
  return {
    async load() {
      return last ?? EMPTY;
    },
    async save(progress) {
      last = progress;
    },
    async export() {
      return JSON.stringify(last);
    },
    async clear() {
      last = null;
    },
    saved: () => last,
  };
}

/** What a learner would do at the current entry, answering per `answer`. */
function nextInput(state: SessionState, answer: 'right' | 'wrong'): CommitInput {
  const entry = state.queue[state.index];
  if (entry === undefined) {
    throw new Error('walked past the end of the queue');
  }
  if (state.answered !== null) {
    return {kind: 'continue'};
  }
  if (entry.position.kind === 'end') {
    return {kind: 'finish'};
  }
  if (entry.position.kind !== 'exercise') {
    return {kind: 'continue'};
  }
  const exercise = entry.position.exercise;
  if (exercise.commitMode === 'pairs') {
    const unmatched = exercise.options.find(option => !state.matched.includes(option.itemId));
    return {kind: 'pair', a: unmatched?.itemId ?? '', b: unmatched?.itemId ?? ''};
  }
  const options = entry.options ?? exercise.options;
  const pick =
    answer === 'right'
      ? options.find(option => option.isAnswer)
      : options.find(option => !option.isAnswer);
  return {kind: 'tap', itemId: pick?.itemId ?? ''};
}

type Walked = {state: SessionState; progress: Progress};

async function walk(
  store: ProgressStore,
  decide: (state: SessionState) => 'right' | 'wrong',
): Promise<Walked> {
  const source = new JsonContentSource(fixture as unknown as ContentFixture);
  const session = await startStop(
    {walk: source, exercises: source, dictionary: source},
    STOP_ID,
    seededRng(42),
  );
  let state = session.state;
  let progress = EMPTY;
  let guard = 0;
  while (state.phase === 'running') {
    if (guard++ > 500) {
      throw new Error('the session never ended');
    }
    const input = nextInput(state, decide(state));
    const result = await submitAnswer({store}, progress, state, input, seededRng(guard), TODAY);
    state = result.state;
    progress = result.progress;
  }
  return {state, progress};
}

describe('walking stop.core.c1.1 end to end', () => {
  it('advances the engine and persists progress on a clean run', async () => {
    // Given
    const store = memoryStore();

    // When — every answer right
    const {state, progress} = await walk(store, () => 'right');

    // Then — 42 scripted positions minus the 5 audio-hidden drills
    expect(state.phase).toBe('ended');
    expect(state.queue.length).toBe(37);
    const met = Object.values(progress.items).filter(item => item.state === 'met');
    expect(met.length).toBe(12); // 8 words + 4 phrases taught by their cards
    expect(progress.walkedOn).toEqual([TODAY]);
    expect(progress.completedStops).toEqual([STOP_ID]);
    expect(state.stillMissed).toEqual([]);

    // Then — the snapshot round-trips through the store
    expect(store.saved()).toEqual(progress);
    expect(await store.load()).toEqual(progress);
  });

  it('returns a miss through the re-queue and the second look, and the total only grows', async () => {
    // Given — miss every first meeting of one presentation, recover nowhere
    const store = memoryStore();
    let firstExerciseKey: string | null = null;
    const totals: number[] = [];

    // When — wrong on the first exercise every time it comes back, right elsewhere
    const {state, progress} = await walk(store, current => {
      totals.push(current.queue.length);
      const entry = current.queue[current.index];
      if (entry?.position.kind !== 'exercise') {
        return 'right';
      }
      if (firstExerciseKey === null) {
        firstExerciseKey = entry.position.exercise.exerciseId;
      }
      const exercise = entry.position.exercise;
      const target = current.queue.find(
        candidate =>
          candidate.position.kind === 'exercise' &&
          candidate.position.exercise.exerciseId === firstExerciseKey,
      );
      const missedItem =
        target?.position.kind === 'exercise' ? target.position.exercise.itemId : null;
      return exercise.itemId === missedItem && exercise.commitMode === 'tap' ? 'wrong' : 'right';
    });

    // Then — the session still ended, the item is on the summary's quiet list
    expect(state.phase).toBe('ended');
    expect(state.stillMissed.length).toBe(1);
    expect(state.secondLookAdded).toBe(true);
    expect(totals.every((v, i) => i === 0 || v >= (totals[i - 1] ?? 0))).toBe(true);

    // Then — the misses reached the persisted record
    const missedId = state.stillMissed[0] ?? '';
    expect(progress.items[missedId]?.missedOn).toEqual([TODAY]);
    expect(progress.completedStops).toEqual([STOP_ID]);
  });
});
