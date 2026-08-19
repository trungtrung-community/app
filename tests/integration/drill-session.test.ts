/**
 * @fileoverview The drill loop end to end: a whole flashcard deck and a whole
 * meaning-pick drill over the real fixture, with a memory ProgressStore and a
 * seeded rng — no doubles inside the boundary. What the walk proves is the
 * §4.6 fold: ratings feed the scheduler exactly like a stop, the day counts,
 * and no stop is ever completed by a drill. Phases per docs/11.
 */

import {describe, expect, it} from 'vitest';

import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';

import {addDays, isoDate} from '../../src/domain/date';
import {
  intervalAt,
  markTaught,
  newItem,
  recordCorrect,
  type ItemId,
  type ItemProgress,
} from '../../src/domain/item';
import type {CommitInput} from '../../src/engine/commit';
import {createDeck, type FlashRating} from '../../src/engine/flashcards';
import {seededRng} from '../../src/engine/rng';
import {createSession, type SessionState} from '../../src/engine/session';
import type {StopId} from '../../src/ports/content-ids';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';
import {planDrill, planFlashcards, selectSet} from '../../src/usecases/drill-plan';
import {gatherPool, type DrillPool} from '../../src/usecases/drill-pool';
import {submitDrillAnswer, submitFlashRating} from '../../src/usecases/submit-drill-answer';

const STOP_ID = 'stop.core.c1.1' as StopId;
const TODAY = isoDate('2026-08-19');
const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** Today's build: no recordings shipped, the audio-free switch off. */
const CTX = {audioAvailable: false, audioFree: false};

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

async function poolOfStop(): Promise<DrillPool> {
  const source = new JsonContentSource(fixture as unknown as ContentFixture);
  return gatherPool(
    {walk: source, exercises: source, dictionary: source},
    {
      kind: 'stop',
      stopId: STOP_ID,
    },
  );
}

/** Every pool item taught, with `history` layered on per item. */
function taughtAll(
  pool: DrillPool,
  history: (item: ItemProgress) => ItemProgress = item => item,
): Progress {
  const items: Record<string, ItemProgress> = {};
  for (const itemId of pool.itemKinds.keys()) {
    items[itemId] = history(markTaught(newItem(itemId as ItemId)));
  }
  return {...EMPTY, items};
}

describe('walking a whole flashcard deck over stop.core.c1.1', () => {
  it('folds every rating into the scheduler and stamps the day, never a stop', async () => {
    // Given — the stop's 12 items taught, one destined for a single Again
    const pool = await poolOfStop();
    const store = memoryStore();
    let progress = taughtAll(pool);
    const set = selectSet(pool, 'all', progress, TODAY);
    expect(set.itemIds.length).toBe(12);
    let deck = createDeck(planFlashcards(set), seededRng(7));
    const againId = deck.queue[0]?.itemId ?? '';

    // When — Again once on the first card, Got it on everything else
    let guard = 0;
    while (deck.phase === 'running') {
      if (guard++ > 50) {
        throw new Error('the deck never ended');
      }
      const card = deck.queue[deck.index];
      const rating: FlashRating =
        card?.itemId === againId && !deck.ratedAgain.includes(againId) ? 'again' : 'got-it';
      const result = await submitFlashRating({store}, progress, deck, rating, TODAY);
      deck = result.state;
      progress = result.progress;
    }

    // Then — the counter's total grew by exactly the one Again
    expect(deck.total).toBe(13);

    // Then — the slip and the corrects reached the scheduler
    expect(progress.items[againId]?.missedOn).toEqual([TODAY]);
    for (const itemId of set.itemIds) {
      expect(progress.items[itemId]?.correctOn).toEqual([TODAY]);
      expect(progress.items[itemId]?.state).toBe('met');
    }

    // Then — the day counts and no stop was completed
    expect(progress.walkedOn).toEqual([TODAY]);
    expect(progress.completedStops).toEqual([]);
    expect(store.saved()).toEqual(progress);
  });
});

describe('walking a whole meaning-pick drill over stop.core.c1.1', () => {
  it('turns yesterday-met words known and schedules each first review', async () => {
    // Given — every item already correct once, three days ago
    const pool = await poolOfStop();
    const store = memoryStore();
    let progress = taughtAll(pool, item => recordCorrect(item, addDays(TODAY, -3)));
    const set = selectSet(pool, 'all', progress, TODAY);
    const seed = planDrill(set, 'word-recognise', CTX, seededRng(11));
    let state: SessionState = createSession(seed, seededRng(11));

    // Then — 8 meaning-picks plus 8 audio-blocked listen-picks, then the end
    expect(seed.positions.length).toBe(17);

    // When — every answer right, straight through
    let guard = 0;
    while (state.phase === 'running') {
      if (guard++ > 100) {
        throw new Error('the drill never ended');
      }
      const result = await submitDrillAnswer(
        {store},
        progress,
        state,
        nextInput(state),
        seededRng(guard),
        TODAY,
      );
      state = result.state;
      progress = result.progress;
    }

    // Then — nothing was re-queued on a clean run
    expect(state.queue.length).toBe(seed.positions.length);

    // Then — each drilled word is known, on the ladder rung its corrects earned
    const asked = new Map<string, number>();
    for (const position of seed.positions) {
      if (position.kind === 'exercise' && position.exercise.itemId !== null) {
        asked.set(position.exercise.itemId, (asked.get(position.exercise.itemId) ?? 0) + 1);
      }
    }
    expect(asked.size).toBe(8);
    for (const [itemId, count] of asked) {
      const item = progress.items[itemId];
      expect(item?.state).toBe('known');
      expect(item?.intervalIndex).toBe(count - 1);
      expect(item?.dueOn).toBe(addDays(TODAY, intervalAt(count - 1)));
    }

    // Then — the phrases the mode does not drill kept their history untouched
    const drilled = new Set(asked.keys());
    for (const itemId of set.itemIds.filter(id => !drilled.has(id))) {
      expect(progress.items[itemId]?.correctOn).toEqual([addDays(TODAY, -3)]);
      expect(progress.items[itemId]?.state).toBe('met');
    }

    // Then — the day counts, no stop completes, and the snapshot round-trips
    expect(progress.walkedOn).toEqual([TODAY]);
    expect(progress.completedStops).toEqual([]);
    expect(store.saved()).toEqual(progress);
    expect(await store.load()).toEqual(progress);
  });
});

/** What a learner answering right would do at the current entry. */
function nextInput(state: SessionState): CommitInput {
  if (state.answered !== null) {
    return {kind: 'continue'};
  }
  const entry = state.queue[state.index];
  if (entry === undefined) {
    throw new Error('walked past the end of the queue');
  }
  if (entry.position.kind === 'end') {
    return {kind: 'finish'};
  }
  if (entry.position.kind !== 'exercise') {
    return {kind: 'continue'};
  }
  const options = entry.options ?? entry.position.exercise.options;
  const pick = options.find(option => option.isAnswer);
  return {kind: 'tap', itemId: pick?.itemId ?? ''};
}
