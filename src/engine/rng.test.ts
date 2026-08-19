/**
 * @fileoverview The engine's randomness: seeded, injectable, assertable.
 * Phases per `docs/11-testing-conventions.md`.
 */

import {describe, expect, it} from 'vitest';

import {intBetween, seededRng, shuffled} from './rng';

describe('seededRng', () => {
  it('repeats the same sequence for the same seed', () => {
    // Given
    const first = seededRng(42);
    const second = seededRng(42);

    // When
    const a = [first(), first(), first()];
    const b = [second(), second(), second()];

    // Then
    expect(a).toEqual(b);
  });

  it('stays inside [0, 1)', () => {
    // Given
    const rng = seededRng(7);

    // When
    const draws = Array.from({length: 1000}, () => rng());

    // Then
    expect(draws.every(value => value >= 0 && value < 1)).toBe(true);
  });

  it('diverges across seeds', () => {
    // When
    const a = seededRng(1)();
    const b = seededRng(2)();

    // Then
    expect(a).not.toBe(b);
  });
});

describe('intBetween', () => {
  it('reaches both bounds, inclusive', () => {
    // Given — the re-queue rule needs every value of 3..5 to be possible
    const rng = seededRng(3);

    // When
    const seen = new Set(Array.from({length: 500}, () => intBetween(rng, 3, 5)));

    // Then
    expect([...seen].sort()).toEqual([3, 4, 5]);
  });

  it('pins to the floor and the ceiling at the extremes', () => {
    // When
    const low = intBetween(() => 0, 3, 5);
    const high = intBetween(() => 0.999999, 3, 5);

    // Then
    expect(low).toBe(3);
    expect(high).toBe(5);
  });
});

describe('shuffled', () => {
  it('returns a permutation of the input', () => {
    // Given
    const items = ['a', 'b', 'c', 'd', 'e'];

    // When
    const out = shuffled(seededRng(9), items);

    // Then
    expect([...out].sort()).toEqual(items);
    expect(items).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('is deterministic per seed', () => {
    // Given
    const items = [1, 2, 3, 4, 5, 6, 7, 8];

    // When
    const a = shuffled(seededRng(11), items);
    const b = shuffled(seededRng(11), items);

    // Then
    expect(a).toEqual(b);
  });

  it('actually moves things for typical seeds', () => {
    // Given — the answer is stored first in every Speak exercise, so a shuffle
    // that leaves order intact for common seeds would be a quiz with one answer
    const items = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

    // When
    const moved = [1, 2, 3, 4, 5].filter(
      seed => !shuffled(seededRng(seed), items).every((v, i) => v === i),
    );

    // Then
    expect(moved.length).toBe(5);
  });
});
