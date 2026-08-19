/**
 * @fileoverview O9's two conjuncts, exercised one at a time.
 *
 * Each test flips exactly one side of "every letter met and every rule taught" so a
 * regression names the conjunct it broke. The monotonicity case is the guard on the
 * decision's shape: learning can only grow the set, never shrink it.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {describe, expect, it} from 'vitest';

import {readable, type ReadState, type ReadableWord} from './readable';

/** བོད — two letters once the vowel drops, and both suffix rules. */
const BOD: ReadableWord = {
  id: 'word.bod',
  bo: 'བོད',
  ruleIds: ['R-SUF', 'R-FRONT'],
};

/** མ — one letter, no rules. */
const MA: ReadableWord = {id: 'word.ma', bo: 'མ', ruleIds: []};

const FULL_STATE: ReadState = {
  metLetterBos: new Set(['བ', 'ད', 'མ']),
  taughtRuleIds: new Set(['R-SUF', 'R-FRONT']),
};

describe('readable', () => {
  it('admits a word whose letters are all met and rules all taught', () => {
    // When
    const words = readable([BOD], FULL_STATE);

    // Then
    expect(words).toEqual([BOD]);
  });

  it('holds a word back while one of its letters is unmet', () => {
    // Given
    const state: ReadState = {
      ...FULL_STATE,
      metLetterBos: new Set(['བ', 'མ']),
    };

    // When
    const words = readable([BOD], state);

    // Then
    expect(words).toEqual([]);
  });

  it('holds a word back while one of its rules is untaught', () => {
    // Given
    const state: ReadState = {
      ...FULL_STATE,
      taughtRuleIds: new Set(['R-SUF']),
    };

    // When
    const words = readable([BOD], state);

    // Then
    expect(words).toEqual([]);
  });

  it('decides a rule-free word by its letters alone', () => {
    // Given
    const state: ReadState = {
      metLetterBos: new Set(['མ']),
      taughtRuleIds: new Set(),
    };

    // When
    const words = readable([MA], state);

    // Then
    expect(words).toEqual([MA]);
  });

  it('returns empty for an empty word list', () => {
    // When
    const words = readable([], FULL_STATE);

    // Then
    expect(words).toEqual([]);
  });

  it('never shrinks when a new letter is met', () => {
    // Given
    const before: ReadState = {
      metLetterBos: new Set(['མ']),
      taughtRuleIds: new Set(['R-SUF', 'R-FRONT']),
    };
    const after: ReadState = {
      ...before,
      metLetterBos: new Set(['མ', 'བ']),
    };

    // When
    const wordsBefore = readable([BOD, MA], before);
    const wordsAfter = readable([BOD, MA], after);

    // Then
    for (const word of wordsBefore) {
      expect(wordsAfter).toContain(word);
    }
  });
});
