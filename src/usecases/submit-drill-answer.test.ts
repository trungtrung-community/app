/**
 * @fileoverview submitDrillAnswer / submitFlashRating — drill events become
 * persisted progress. Fold parity with the stop path, walkedOn without
 * completedStops, the null-item pair board, and the at-most-once Again.
 */

import {describe, expect, it} from 'vitest';

import {isoDate} from '../domain/date';
import type {ItemId, ItemProgress} from '../domain/item';
import {createDeck} from '../engine/flashcards';
import {seededRng} from '../engine/rng';
import {createSession, type SeedExercise, type SessionSeed} from '../engine/session';
import type {Progress, ProgressStore} from '../ports/progress-store';

import {submitDrillAnswer, submitFlashRating} from './submit-drill-answer';

const TODAY = isoDate('2026-08-19');

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

const KNOWN_ITEM: ItemProgress = {
  itemId: 'vocab.cha' as ItemId,
  state: 'known',
  correctOn: [isoDate('2026-08-01'), isoDate('2026-08-05')],
  missedOn: [],
  intervalIndex: 2,
  dueOn: isoDate('2026-08-12'),
};

const KNOWN: Progress = {...EMPTY, items: {'vocab.cha': KNOWN_ITEM}};

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
      return '';
    },
    async clear() {
      last = null;
    },
    saved: () => last,
  };
}

const EXERCISE: SeedExercise = {
  exerciseId: 'ex.1',
  itemId: 'vocab.cha',
  exerciseType: 'meaning-pick',
  presentation: 'meaning-pick',
  commitMode: 'tap',
  options: [
    {itemId: 'vocab.cha', isAnswer: true},
    {itemId: 'vocab.other', isAnswer: false},
  ],
};

const PAIR_BOARD: SeedExercise = {
  exerciseId: 'ex.pairs',
  itemId: null,
  exerciseType: 'pair-match',
  presentation: 'pair-match',
  commitMode: 'pairs',
  options: [
    {itemId: 'vocab.cha', isAnswer: false},
    {itemId: 'vocab.ja', isAnswer: false},
  ],
};

function drillSeed(exercise: SeedExercise): SessionSeed {
  return {
    stopId: 'drill.core.c1',
    positions: [
      {kind: 'exercise', exercise},
      {kind: 'end', capabilities: []},
    ],
    poolByItem: {},
  };
}

describe('submitDrillAnswer', () => {
  it('records a correct answer on the day it happened', async () => {
    // Given
    const store = memoryStore();
    const state = createSession(drillSeed(EXERCISE), seededRng(1));
    const options = state.queue[state.index]?.options ?? [];
    const answer = options.find(option => option.isAnswer);

    // When
    const result = await submitDrillAnswer(
      {store},
      EMPTY,
      state,
      {kind: 'tap', itemId: answer?.itemId ?? ''},
      seededRng(1),
      TODAY,
    );

    // Then
    expect(result.progress.items['vocab.cha']?.correctOn).toEqual([TODAY]);
  });

  it('records a miss on the day it happened', async () => {
    // Given
    const store = memoryStore();
    const state = createSession(drillSeed(EXERCISE), seededRng(1));
    const options = state.queue[state.index]?.options ?? [];
    const wrong = options.find(option => !option.isAnswer);

    // When
    const result = await submitDrillAnswer(
      {store},
      EMPTY,
      state,
      {kind: 'tap', itemId: wrong?.itemId ?? ''},
      seededRng(1),
      TODAY,
    );

    // Then
    expect(result.progress.items['vocab.cha']?.missedOn).toEqual([TODAY]);
  });

  it('marks the day walked and no stop completed at the end', async () => {
    // Given
    const store = memoryStore();
    let state = createSession(drillSeed(EXERCISE), seededRng(1));
    let progress = EMPTY;
    const options = state.queue[state.index]?.options ?? [];
    const answer = options.find(option => option.isAnswer);
    const answered = await submitDrillAnswer(
      {store},
      progress,
      state,
      {kind: 'tap', itemId: answer?.itemId ?? ''},
      seededRng(1),
      TODAY,
    );
    state = answered.state;
    progress = answered.progress;
    const advanced = await submitDrillAnswer(
      {store},
      progress,
      state,
      {kind: 'continue'},
      seededRng(1),
      TODAY,
    );
    state = advanced.state;
    progress = advanced.progress;

    // When
    const result = await submitDrillAnswer(
      {store},
      progress,
      state,
      {kind: 'finish'},
      seededRng(1),
      TODAY,
    );

    // Then
    expect(result.progress.walkedOn).toEqual([TODAY]);
    expect(result.progress.completedStops).toEqual([]);
  });

  it('records nothing per item on a pair board', async () => {
    // Given
    const store = memoryStore();
    const state = createSession(drillSeed(PAIR_BOARD), seededRng(1));
    const first = await submitDrillAnswer(
      {store},
      EMPTY,
      state,
      {kind: 'pair', a: 'vocab.cha', b: 'vocab.cha'},
      seededRng(1),
      TODAY,
    );

    // When
    const result = await submitDrillAnswer(
      {store},
      first.progress,
      first.state,
      {kind: 'pair', a: 'vocab.ja', b: 'vocab.ja'},
      seededRng(1),
      TODAY,
    );

    // Then
    expect(result.progress.items).toEqual({});
  });

  it('starts the save and resolves persisted when it lands', async () => {
    // Given
    const store = memoryStore();
    const state = createSession(drillSeed(EXERCISE), seededRng(1));
    const options = state.queue[state.index]?.options ?? [];
    const answer = options.find(option => option.isAnswer);

    // When
    const result = await submitDrillAnswer(
      {store},
      EMPTY,
      state,
      {kind: 'tap', itemId: answer?.itemId ?? ''},
      seededRng(1),
      TODAY,
    );

    // Then
    await result.persisted;
    expect(store.saved()).toBe(result.progress);
  });
});

describe('submitFlashRating', () => {
  it('records Got it as a correct answer', async () => {
    // Given
    const store = memoryStore();
    const deck = createDeck([{itemId: 'vocab.cha'}, {itemId: 'vocab.ja'}], seededRng(1));

    // When
    const result = await submitFlashRating({store}, EMPTY, deck, 'got-it', TODAY);

    // Then
    const rated = result.state.queue[0]?.itemId ?? '';
    expect(result.progress.items[rated]?.correctOn).toEqual([TODAY]);
  });

  it('steps the interval back exactly once over three Agains', async () => {
    // Given
    const store = memoryStore();
    let deck = createDeck([{itemId: 'vocab.cha'}], seededRng(1));
    let progress = KNOWN;

    // When
    for (let i = 0; i < 3; i++) {
      const step = await submitFlashRating({store}, progress, deck, 'again', TODAY);
      deck = step.state;
      progress = step.progress;
    }

    // Then
    expect(progress.items['vocab.cha']?.intervalIndex).toBe(1);
    expect(progress.items['vocab.cha']?.missedOn).toEqual([TODAY]);
  });

  it('marks the day walked and no stop completed at the end', async () => {
    // Given
    const store = memoryStore();
    const deck = createDeck([{itemId: 'vocab.cha'}], seededRng(1));

    // When
    const result = await submitFlashRating({store}, EMPTY, deck, 'got-it', TODAY);

    // Then
    expect(result.progress.walkedOn).toEqual([TODAY]);
    expect(result.progress.completedStops).toEqual([]);
  });

  it('starts the save and resolves persisted when it lands', async () => {
    // Given
    const store = memoryStore();
    const deck = createDeck([{itemId: 'vocab.cha'}], seededRng(1));

    // When
    const result = await submitFlashRating({store}, EMPTY, deck, 'got-it', TODAY);

    // Then
    await result.persisted;
    expect(store.saved()).toBe(result.progress);
  });

  it('saves nothing when nothing changed', async () => {
    // Given
    const store = memoryStore();
    const deck = createDeck([], seededRng(1));

    // When
    const result = await submitFlashRating({store}, EMPTY, deck, 'got-it', TODAY);

    // Then
    await result.persisted;
    expect(store.saved()).toBeNull();
  });
});
