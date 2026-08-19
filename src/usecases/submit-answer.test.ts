/**
 * @fileoverview submitAnswer — the engine's events become persisted progress.
 * One call: commit, fold, save. Phases per docs/11.
 */

import {describe, expect, it} from 'vitest';

import {isoDate} from '../domain/date';
import {seededRng} from '../engine/rng';
import {createSession, type SeedExercise, type SessionSeed} from '../engine/session';
import type {Progress, ProgressStore} from '../ports/progress-store';

import {submitAnswer} from './submit-answer';

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

function seed(): SessionSeed {
  return {
    stopId: 'stop.core.c1.1',
    positions: [
      {kind: 'card', card: 'word', itemId: 'vocab.cha'},
      {kind: 'exercise', exercise: EXERCISE},
      {kind: 'end', capabilities: ['Greet someone']},
    ],
    poolByItem: {},
  };
}

describe('submitAnswer', () => {
  it('persists markTaught when a card commits', async () => {
    // Given
    const store = memoryStore();
    const state = createSession(seed(), seededRng(1));

    // When
    const result = await submitAnswer(
      {store},
      EMPTY,
      state,
      {kind: 'continue'},
      seededRng(1),
      TODAY,
    );

    // Then
    expect(result.progress.items['vocab.cha']?.state).toBe('met');
    expect(store.saved()).toBe(result.progress);
  });

  it('records a correct answer on the day it happened', async () => {
    // Given — advance past the card to the exercise
    const store = memoryStore();
    let state = createSession(seed(), seededRng(1));
    state = (
      await submitAnswer({store}, EMPTY, state, {kind: 'continue'}, seededRng(1), TODAY)
    ).state;
    const options = state.queue[state.index]?.options ?? [];
    const answer = options.find(option => option.isAnswer);

    // When
    const result = await submitAnswer(
      {store},
      store.saved() ?? EMPTY,
      state,
      {kind: 'tap', itemId: answer?.itemId ?? ''},
      seededRng(1),
      TODAY,
    );

    // Then
    expect(result.progress.items['vocab.cha']?.correctOn).toEqual([TODAY]);
  });

  it('records a miss', async () => {
    // Given
    const store = memoryStore();
    let state = createSession(seed(), seededRng(1));
    state = (
      await submitAnswer({store}, EMPTY, state, {kind: 'continue'}, seededRng(1), TODAY)
    ).state;
    const options = state.queue[state.index]?.options ?? [];
    const wrong = options.find(option => !option.isAnswer);

    // When
    const result = await submitAnswer(
      {store},
      store.saved() ?? EMPTY,
      state,
      {kind: 'tap', itemId: wrong?.itemId ?? ''},
      seededRng(1),
      TODAY,
    );

    // Then
    expect(result.progress.items['vocab.cha']?.missedOn).toEqual([TODAY]);
  });

  it('marks the day walked and the stop completed at the end', async () => {
    // Given — a session already standing on the end entry
    const store = memoryStore();
    let state = createSession(seed(), seededRng(1));
    let progress = EMPTY;
    while (state.index < state.queue.length - 1) {
      const entry = state.queue[state.index];
      const options = entry?.options ?? [];
      const answer = options.find(option => option.isAnswer);
      const input =
        entry?.position.kind === 'exercise' && state.answered === null
          ? ({kind: 'tap', itemId: answer?.itemId ?? ''} as const)
          : ({kind: 'continue'} as const);
      const step = await submitAnswer({store}, progress, state, input, seededRng(1), TODAY);
      state = step.state;
      progress = step.progress;
    }

    // When
    const result = await submitAnswer(
      {store},
      progress,
      state,
      {kind: 'finish'},
      seededRng(1),
      TODAY,
    );

    // Then
    expect(result.progress.walkedOn).toEqual([TODAY]);
    expect(result.progress.completedStops).toEqual(['stop.core.c1.1']);
  });

  it('saves nothing when nothing changed', async () => {
    // Given — an intro-only session
    const store = memoryStore();
    const state = createSession(
      {
        stopId: 'stop.core.c1.1',
        positions: [
          {kind: 'intro', text: 'In', outcome: 'Out', capabilities: []},
          {kind: 'end', capabilities: []},
        ],
        poolByItem: {},
      },
      seededRng(1),
    );

    // When
    await submitAnswer({store}, EMPTY, state, {kind: 'continue'}, seededRng(1), TODAY);

    // Then
    expect(store.saved()).toBeNull();
  });
});
