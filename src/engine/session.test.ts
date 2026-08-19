/**
 * @fileoverview createSession — the seed becomes a queue: options shuffled per
 * entry, the closing boundary found, nothing else invented yet. Phases per
 * `docs/11-testing-conventions.md`.
 */

import {describe, expect, it} from 'vitest';

import {seededRng} from './rng';
import {createSession, type SeedExercise, type SeedPosition, type SessionSeed} from './session';

function exercise(id: string, optionItems: readonly string[]): SeedExercise {
  return {
    exerciseId: id,
    itemId: optionItems[0] ?? null,
    exerciseType: 'meaning-pick',
    presentation: 'meaning-pick',
    commitMode: 'tap',
    // Stored order: the answer first, as the content ships it.
    options: optionItems.map((itemId, i) => ({itemId, isAnswer: i === 0})),
  };
}

function seed(positions: readonly SeedPosition[]): SessionSeed {
  return {stopId: 'stop.core.c1.1', positions, poolByItem: {}, artifacts: []};
}

const INTRO: SeedPosition = {kind: 'intro', text: 'Hello', outcome: 'Greet', capabilities: []};
const CARD: SeedPosition = {kind: 'card', card: 'word', itemId: 'vocab.tashi-delek'};
const MOMENT: SeedPosition = {kind: 'moment'};
const END: SeedPosition = {kind: 'end', capabilities: []};

describe('createSession', () => {
  it('mirrors the seed, one entry per position, all first asks', () => {
    // Given
    const positions = [
      INTRO,
      CARD,
      {kind: 'exercise', exercise: exercise('ex.1', ['a', 'b'])} as const,
      MOMENT,
      END,
    ];

    // When
    const state = createSession(seed(positions), seededRng(1));

    // Then
    expect(state.queue.map(entry => entry.position.kind)).toEqual([
      'intro',
      'card',
      'exercise',
      'moment',
      'end',
    ]);
    expect(state.queue.every(entry => entry.ask === 'first')).toBe(true);
    expect(state.index).toBe(0);
    expect(state.phase).toBe('running');
  });

  it('shuffles each answer-bearing entry exactly as the rng dictates', () => {
    // Given — a scripted rng that always draws 0 walks Fisher–Yates to a known order
    const positions = [
      {kind: 'exercise', exercise: exercise('ex.1', ['a', 'b', 'c', 'd'])} as const,
      END,
    ];

    // When
    const state = createSession(seed(positions), () => 0);

    // Then — the stored-first answer 'a' is no longer first
    expect(state.queue[0]?.options?.map(option => option.itemId)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('leaves non-exercise entries without options', () => {
    // When
    const state = createSession(seed([INTRO, CARD, END]), seededRng(1));

    // Then
    expect(state.queue.every(entry => entry.options === undefined)).toBe(true);
  });

  it('finds the closing boundary at the moment', () => {
    // When
    const state = createSession(seed([INTRO, CARD, MOMENT, END]), seededRng(1));

    // Then
    expect(state.closingAt).toBe(2);
  });

  it('falls back to the end when a stop has no moment', () => {
    // When
    const state = createSession(seed([INTRO, CARD, END]), seededRng(1));

    // Then
    expect(state.closingAt).toBe(2);
  });

  it('starts the consecutive-correct run at zero', () => {
    // When
    const state = createSession(seed([INTRO, END]), seededRng(1));

    // Then
    expect(state.run).toBe(0);
  });

  it('leaves the second look armed by default', () => {
    // When
    const state = createSession(seed([INTRO, END]), seededRng(1));

    // Then
    expect(state.secondLookAdded).toBe(false);
  });

  it('reads a secondLook:false seed as already-added, so the splice never arms', () => {
    // When
    const state = createSession({...seed([INTRO, END]), secondLook: false}, seededRng(1));

    // Then
    expect(state.secondLookAdded).toBe(true);
  });
});
