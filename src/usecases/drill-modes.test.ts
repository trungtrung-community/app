/**
 * @fileoverview A mode is drawn only when the set can fill it — docs/03 §4.6.
 * Absent below its minimum, absent with nothing eligible, and its count is in
 * its own unit. Phases per docs/11.
 */

import {describe, expect, it} from 'vitest';

import type {Exercise, ExerciseFamily} from '../ports/content-exercise';
import type {ExerciseId, StopId, Track} from '../ports/content-ids';

import {availableModes} from './drill-modes';
import type {DrillSet} from './drill-pool';

let nextId = 0;

function drill(
  type: 'meaning-pick' | 'listen-pick' | 'phrase-recognise' | 'pair-match',
  blockedOn: 'audio' | null = null,
): Exercise {
  const core = {
    id: `ex.${(nextId += 1)}` as ExerciseId,
    stopId: 'stop.core.c1.1' as StopId,
    track: 'speak' as Track,
    ordinal: 1,
    family: 'tap-select (text)' as ExerciseFamily,
    target: null,
    answerId: null,
    blockedOn,
    prompt: {audioPath: null, bo: null, roman: null, en: null},
    distractorRule: null,
    reason: null,
    options: [],
    chunks: [],
  };
  return type === 'pair-match' ? {...core, type, board: 1, boards: 1} : {...core, type};
}

function words(count: number): string[] {
  return Array.from({length: count}, (unused, index) => `vocab.w${index}`);
}

function set(itemIds: readonly string[], exercises: readonly Exercise[]): DrillSet {
  return {itemIds, exercises};
}

function countOf(drawn: readonly {mode: {id: string}; count: number}[], id: string): number | null {
  return drawn.find(entry => entry.mode.id === id)?.count ?? null;
}

describe('availableModes', () => {
  it('counts 24 words as 24 cards, 24 questions and 5 boards', () => {
    // Given — a question per word, and a board exercise to make pair-match real
    const exercises = [...words(24).map(() => drill('meaning-pick')), drill('pair-match')];

    // When
    const drawn = availableModes(set(words(24), exercises));

    // Then — each count in the mode's own unit
    expect(countOf(drawn, 'flashcards')).toBe(24);
    expect(countOf(drawn, 'word-recognise')).toBe(24);
    expect(countOf(drawn, 'pair-match')).toBe(5);
  });

  it('draws match the pairs at five distinct items and not below', () => {
    // When — four items, however willing the learner is
    const four = availableModes(set(words(4), [drill('pair-match')]));

    // Then
    expect(countOf(four, 'pair-match')).toBeNull();

    // When
    const five = availableModes(set(words(5), [drill('pair-match')]));

    // Then
    expect(countOf(five, 'pair-match')).toBe(1);
  });

  it('omits a mode the set holds nothing eligible for', () => {
    // Given — plenty of items, but no pair board and no phrase drill
    const drawn = availableModes(set(words(24), [drill('meaning-pick')]));

    // Then — absent, never greyed or locked
    expect(countOf(drawn, 'pair-match')).toBeNull();
    expect(countOf(drawn, 'phrase-recognise')).toBeNull();
  });

  it('counts a blocked listen-pick toward word recognition and an unblocked one not at all', () => {
    // Given — the same substitution the stop planner performs
    const exercises = [
      drill('meaning-pick'),
      drill('listen-pick', 'audio'),
      drill('listen-pick', null),
    ];

    // When
    const drawn = availableModes(set(words(3), exercises));

    // Then
    expect(countOf(drawn, 'word-recognise')).toBe(2);
  });

  it('counts a blocked phrase-recognise and not an unblocked one', () => {
    // When
    const drawn = availableModes(
      set(
        ['phrase.a', 'phrase.b'],
        [drill('phrase-recognise', 'audio'), drill('phrase-recognise', null)],
      ),
    );

    // Then
    expect(countOf(drawn, 'phrase-recognise')).toBe(1);
  });

  it('offers flashcards on items alone and nothing on an empty set', () => {
    // When — two items, no exercises at all
    const two = availableModes(set(words(2), []));

    // Then
    expect(two.map(entry => entry.mode.id)).toEqual(['flashcards']);
    expect(countOf(two, 'flashcards')).toBe(2);

    // When
    const empty = availableModes(set([], []));

    // Then — an empty set is said, not filled
    expect(empty).toEqual([]);
  });
});
