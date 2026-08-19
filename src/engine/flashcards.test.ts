/**
 * @fileoverview createDeck and rate — the self-rated pile of docs/03 §7,
 * asserted with seeded rngs so every deal is exact. Phases per
 * `docs/11-testing-conventions.md`.
 */

import {describe, expect, it} from 'vitest';

import {createDeck, rate, type FlashDeckCard, type FlashDeckState} from './flashcards';
import {seededRng} from './rng';

function cards(...itemIds: readonly string[]): readonly FlashDeckCard[] {
  return itemIds.map(itemId => ({itemId}));
}

describe('createDeck', () => {
  it('deals the same order for the same seed', () => {
    // Given
    const input = cards('a', 'b', 'c', 'd', 'e', 'f');

    // When
    const first = createDeck(input, seededRng(11));
    const second = createDeck(input, seededRng(11));

    // Then
    expect(first.queue).toEqual(second.queue);
    expect(first.total).toBe(6);
    expect(first.index).toBe(0);
    expect(first.phase).toBe('running');
  });

  it('is born already ended when there is nothing to deal', () => {
    // When
    const state = createDeck([], seededRng(1));

    // Then
    expect(state.phase).toBe('ended');
    expect(state.queue).toEqual([]);
    expect(state.total).toBe(0);
  });
});

describe('rate', () => {
  it('re-inserts an Again card at the back and grows the total by exactly one', () => {
    // Given
    const state = createDeck(cards('a', 'b', 'c'), seededRng(1));
    const current = state.queue[0];

    // When
    const outcome = rate(state, 'again');

    // Then
    expect(outcome.state.queue.at(-1)).toEqual(current);
    expect(outcome.state.queue).toHaveLength(4);
    expect(outcome.state.total).toBe(4);
    expect(outcome.state.index).toBe(1);
    expect(outcome.events).toEqual([{kind: 'again', itemId: current?.itemId, firstTime: true}]);
  });

  it('marks firstTime only on the first Again per item', () => {
    // Given
    let state = createDeck(cards('a'), seededRng(1));

    // When
    const flags: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      const outcome = rate(state, 'again');
      state = outcome.state;
      flags.push(
        ...outcome.events.flatMap(event => (event.kind === 'again' ? [event.firstTime] : [])),
      );
    }

    // Then
    expect(flags).toEqual([true, false, false]);
  });

  it('emits correct and advances without growing the queue on Got it', () => {
    // Given
    const state = createDeck(cards('a', 'b', 'c'), seededRng(1));

    // When
    const outcome = rate(state, 'got-it');

    // Then
    expect(outcome.state.index).toBe(1);
    expect(outcome.state.total).toBe(3);
    expect(outcome.state.queue).toHaveLength(3);
    expect(outcome.events).toEqual([{kind: 'correct', itemId: state.queue[0]?.itemId}]);
  });

  it('ends the deck with an ended event on Got it past the last card', () => {
    // Given
    const state = createDeck(cards('a'), seededRng(1));

    // When
    const outcome = rate(state, 'got-it');

    // Then
    expect(outcome.state.phase).toBe('ended');
    expect(outcome.events).toEqual([{kind: 'correct', itemId: 'a'}, {kind: 'ended'}]);
  });

  it('ignores ratings on an ended deck', () => {
    // Given
    const ended = rate(createDeck(cards('a'), seededRng(1)), 'got-it').state;

    // When
    const outcome = rate(ended, 'again');

    // Then
    expect(outcome.state).toBe(ended);
    expect(outcome.events).toEqual([]);
  });

  it('never shrinks the total or moves the index backwards across a full walk', () => {
    // Given
    let state: FlashDeckState = createDeck(cards('a', 'b', 'c', 'd'), seededRng(7));

    // When
    const totals: number[] = [state.total];
    const indices: number[] = [state.index];
    for (let step = 0; step < 100 && state.phase === 'running'; step++) {
      const current = state.queue[state.index];
      const rating = state.ratedAgain.includes(current?.itemId ?? '') ? 'got-it' : 'again';
      state = rate(state, rating).state;
      totals.push(state.total);
      indices.push(state.index);
    }

    // Then
    expect(state.phase).toBe('ended');
    expect(totals.every((total, i) => i === 0 || total >= (totals[i - 1] ?? 0))).toBe(true);
    expect(indices.every((index, i) => i === 0 || index === (indices[i - 1] ?? 0) + 1)).toBe(true);
    expect(state.total).toBe(8);
    expect(state.index).toBe(8);
  });
});
