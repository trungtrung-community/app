/**
 * @fileoverview The drill planner — docs/03 §4.6's selection and mode over a
 * pool: only taught items drill, due-today and still-getting follow the
 * domain's own rules, boards synthesize at five distinct pairs with the one
 * sanctioned fill from inside the set, the scheduler's order runs most
 * overdue → weakest with kinds alternating, and every drill seed ends with no
 * second look and a pool that cannot leak. Phases per docs/11.
 */

import {describe, expect, it} from 'vitest';

import {isoDate} from '../domain/date';
import type {ItemId, ItemProgress} from '../domain/item';
import {seededRng} from '../engine/rng';
import type {SessionSeed} from '../engine/session';
import type {Exercise, ExerciseFamily} from '../ports/content-exercise';
import type {ContentItemId, ExerciseId, StopId, Track} from '../ports/content-ids';
import type {Progress} from '../ports/progress-store';

import {dueOrder, planDrill, planFlashcards, routeForSet, selectSet} from './drill-plan';
import type {DrillPool, DrillSet} from './drill-pool';
import type {PlanContext} from './exercise-seed';

const TODAY = isoDate('2026-08-19');

/** Today's build: no recordings shipped, the audio-free switch off. */
const SILENT: PlanContext = {audioAvailable: false, audioFree: false};

function exercise(
  id: string,
  target: string | null,
  type: 'meaning-pick' | 'pair-match',
  kind: 'vocab' | 'phrase' = 'vocab',
): Exercise {
  const core = {
    id: id as ExerciseId,
    stopId: 'stop.test' as StopId,
    track: 'speak' as Track,
    ordinal: 1,
    family: 'tap-select (text)' as ExerciseFamily,
    target: target === null ? null : {id: target as ContentItemId, kind},
    answerId: target === null ? null : (target as ContentItemId),
    blockedOn: null,
    prompt: {audioPath: null, bo: null, roman: null, en: null},
    distractorRule: null,
    reason: null,
    options:
      target === null
        ? []
        : [
            {ordinal: 1, itemId: target as ContentItemId, label: null, isAnswer: true},
            {ordinal: 2, itemId: 'vocab.decoy' as ContentItemId, label: null, isAnswer: false},
          ],
    chunks: [],
  };
  return type === 'meaning-pick'
    ? {...core, type: 'meaning-pick'}
    : {...core, type: 'pair-match', board: 1, boards: 1};
}

function meaningPick(id: string, target: string, kind: 'vocab' | 'phrase' = 'vocab'): Exercise {
  return exercise(id, target, 'meaning-pick', kind);
}

function pairMatch(id: string): Exercise {
  return exercise(id, null, 'pair-match');
}

function taught(id: string, over: Partial<ItemProgress> = {}): ItemProgress {
  return {
    itemId: id as ItemId,
    state: 'met',
    correctOn: [],
    missedOn: [],
    intervalIndex: 0,
    dueOn: null,
    ...over,
  };
}

function knownDue(id: string, dueOn: string, intervalIndex = 0): ItemProgress {
  return taught(id, {state: 'known', dueOn: isoDate(dueOn), intervalIndex});
}

function missedOn(id: string, days: readonly string[]): ItemProgress {
  return taught(id, {missedOn: days.map(isoDate)});
}

function progressOf(...items: readonly ItemProgress[]): Progress {
  return {
    walkedOn: [],
    items: Object.fromEntries(items.map(item => [item.itemId, item])),
    completedStops: [],
    version: 1,
  };
}

function poolOf(
  kinds: Record<string, 'vocab' | 'phrase'>,
  exercises: readonly Exercise[] = [],
): DrillPool {
  return {
    exercises,
    itemsById: new Map(),
    itemKinds: new Map(Object.entries(kinds)),
    districtNameByItem: new Map(),
  };
}

function setOf(itemIds: readonly string[], exercises: readonly Exercise[] = []): DrillSet {
  return {itemIds, exercises};
}

function questionItemIds(seed: SessionSeed): readonly (string | null)[] {
  return seed.positions.flatMap(p => (p.kind === 'exercise' ? [p.exercise.itemId] : []));
}

function boards(seed: SessionSeed) {
  return seed.positions.flatMap(p => (p.kind === 'exercise' ? [p.exercise] : []));
}

describe('selectSet', () => {
  it('keeps untaught items out of every selection', () => {
    // Given
    const pool = poolOf({'vocab.a': 'vocab', 'vocab.b': 'vocab', 'vocab.c': 'vocab'});
    const progress = progressOf(
      {
        ...knownDue('vocab.a', '2026-08-18'),
        missedOn: [isoDate('2026-08-17'), isoDate('2026-08-18')],
      },
      taught('vocab.b', {state: 'new'}),
    );

    // When
    const all = selectSet(pool, 'all', progress, TODAY);
    const due = selectSet(pool, 'due-today', progress, TODAY);
    const still = selectSet(pool, 'still-getting', progress, TODAY);

    // Then
    expect(all.itemIds).toEqual(['vocab.a']);
    expect(due.itemIds).toEqual(['vocab.a']);
    expect(still.itemIds).toEqual(['vocab.a']);
  });

  it('selects exactly the items past their interval for due-today', () => {
    // Given
    const pool = poolOf({
      'vocab.overdue': 'vocab',
      'vocab.today': 'vocab',
      'vocab.tomorrow': 'vocab',
      'vocab.met': 'vocab',
    });
    const progress = progressOf(
      knownDue('vocab.overdue', '2026-08-10'),
      knownDue('vocab.today', '2026-08-19'),
      knownDue('vocab.tomorrow', '2026-08-20'),
      taught('vocab.met'),
    );

    // When
    const set = selectSet(pool, 'due-today', progress, TODAY);

    // Then
    expect(set.itemIds).toEqual(['vocab.overdue', 'vocab.today']);
  });

  it('selects exactly the items missed twice inside the window for still-getting', () => {
    // Given
    const pool = poolOf({
      'vocab.twice': 'vocab',
      'vocab.long-ago': 'vocab',
      'vocab.once': 'vocab',
    });
    const progress = progressOf(
      missedOn('vocab.twice', ['2026-08-14', '2026-08-16']),
      missedOn('vocab.long-ago', ['2026-08-01', '2026-08-05']),
      missedOn('vocab.once', ['2026-08-18']),
    );

    // When
    const set = selectSet(pool, 'still-getting', progress, TODAY);

    // Then
    expect(set.itemIds).toEqual(['vocab.twice']);
  });

  it('resolves every selection empty on a first launch', () => {
    // Given
    const pool = poolOf({'vocab.a': 'vocab'}, [meaningPick('ex.a', 'vocab.a'), pairMatch('ex.p')]);

    // When
    const all = selectSet(pool, 'all', null, TODAY);
    const due = selectSet(pool, 'due-today', null, TODAY);
    const still = selectSet(pool, 'still-getting', null, TODAY);

    // Then
    expect(all).toEqual({itemIds: [], exercises: []});
    expect(due).toEqual({itemIds: [], exercises: []});
    expect(still).toEqual({itemIds: [], exercises: []});
  });

  it('drops the exercises whose target left the set and keeps the board while items remain', () => {
    // Given
    const exA = meaningPick('ex.a', 'vocab.a');
    const exB = meaningPick('ex.b', 'vocab.b');
    const board = pairMatch('ex.board');
    const pool = poolOf({'vocab.a': 'vocab', 'vocab.b': 'vocab'}, [exA, exB, board]);
    const progress = progressOf(taught('vocab.a'), taught('vocab.b', {state: 'new'}));

    // When
    const set = selectSet(pool, 'all', progress, TODAY);

    // Then
    expect(set.itemIds).toEqual(['vocab.a']);
    expect(set.exercises).toEqual([exA, board]);
  });
});

describe('planDrill', () => {
  const recogniseSet = setOf(
    ['vocab.a', 'vocab.b', 'vocab.c'],
    [
      meaningPick('ex.a', 'vocab.a'),
      meaningPick('ex.b', 'vocab.b'),
      meaningPick('ex.c', 'vocab.c'),
      pairMatch('ex.board'),
    ],
  );

  it('closes every seed with one end and never a second look', () => {
    // When
    const questions = planDrill(recogniseSet, 'word-recognise', SILENT, seededRng(1));
    const pairs = planDrill(recogniseSet, 'pair-match', SILENT, seededRng(1));

    // Then
    for (const seed of [questions, pairs]) {
      expect(seed.secondLook).toBe(false);
      expect(seed.positions.at(-1)).toEqual({kind: 'end', capabilities: []});
      expect(seed.positions.filter(p => p.kind === 'end')).toHaveLength(1);
    }
  });

  it('draws the sample deterministically by seed', () => {
    // When
    const first = planDrill(recogniseSet, 'word-recognise', SILENT, seededRng(7), {sample: 2});
    const again = planDrill(recogniseSet, 'word-recognise', SILENT, seededRng(7), {sample: 2});

    // Then
    expect(questionItemIds(first)).toHaveLength(2);
    expect(questionItemIds(first)).toEqual(questionItemIds(again));
  });

  it('runs the questions in the set order when asked for the due order', () => {
    // Given
    const set = setOf(
      ['vocab.b', 'vocab.a'],
      [meaningPick('ex.a', 'vocab.a'), meaningPick('ex.b', 'vocab.b')],
    );

    // When
    const seed = planDrill(set, 'word-recognise', SILENT, seededRng(1), {order: 'due'});

    // Then
    expect(questionItemIds(seed)).toEqual(['vocab.b', 'vocab.a']);
  });

  it('lays ceil of items over five boards of five distinct pairs', () => {
    // Given
    const itemIds = Array.from({length: 12}, (_, i) => `vocab.i${i}`);
    const set = setOf(itemIds, [pairMatch('ex.board')]);

    // When
    const seed = planDrill(set, 'pair-match', SILENT, seededRng(5));

    // Then
    const planned = boards(seed);
    expect(planned).toHaveLength(3);
    expect(planned.map(b => b.exerciseId).sort()).toEqual([
      'drill:pairs:0',
      'drill:pairs:1',
      'drill:pairs:2',
    ]);
    for (const board of planned) {
      expect(board.itemId).toBeNull();
      expect(board.commitMode).toBe('pairs');
      expect(board.options).toHaveLength(5);
      expect(new Set(board.options.map(o => o.itemId)).size).toBe(5);
      for (const option of board.options) {
        expect(itemIds).toContain(option.itemId);
      }
    }
  });

  it('tops the last board up from inside the set alone', () => {
    // Given
    const itemIds = Array.from({length: 7}, (_, i) => `vocab.i${i}`);
    const set = setOf(itemIds, [pairMatch('ex.board')]);

    // When
    const seed = planDrill(set, 'pair-match', SILENT, seededRng(5));

    // Then
    const dealt = boards(seed).flatMap(b => b.options.map(o => o.itemId));
    expect(dealt).toHaveLength(10);
    expect(new Set(dealt).size).toBe(7);
    for (const itemId of dealt) {
      expect(itemIds).toContain(itemId);
    }
  });

  it('fills the re-queue pool from the set alone', () => {
    // When
    const seed = planDrill(recogniseSet, 'word-recognise', SILENT, seededRng(1));

    // Then
    expect(Object.keys(seed.poolByItem).sort()).toEqual(['vocab.a', 'vocab.b', 'vocab.c']);
    for (const [itemId, pooled] of Object.entries(seed.poolByItem)) {
      expect(recogniseSet.itemIds).toContain(itemId);
      for (const pooledExercise of pooled) {
        expect(recogniseSet.exercises.map(e => e.id)).toContain(pooledExercise.exerciseId);
      }
    }
  });

  it('refuses the flashcards mode, which runs on the deck', () => {
    // Then
    expect(() => planDrill(recogniseSet, 'flashcards', SILENT, seededRng(1))).toThrow(
      /planFlashcards/,
    );
  });
});

describe('planFlashcards', () => {
  it('deals one card per item', () => {
    // When
    const cards = planFlashcards(setOf(['vocab.a', 'phrase.b']));

    // Then
    expect(cards).toEqual([{itemId: 'vocab.a'}, {itemId: 'phrase.b'}]);
  });
});

describe('dueOrder', () => {
  it('sorts most overdue first, then weakest, breaking ties by seed', () => {
    // Given
    const kinds = poolOf({
      'vocab.w1': 'vocab',
      'vocab.w2': 'vocab',
      'vocab.w3': 'vocab',
      'vocab.t1': 'vocab',
      'vocab.t2': 'vocab',
    }).itemKinds;
    const set = setOf(['vocab.t1', 'vocab.w3', 'vocab.w1', 'vocab.t2', 'vocab.w2']);
    const progress = progressOf(
      knownDue('vocab.w1', '2026-08-05', 3),
      knownDue('vocab.w2', '2026-08-10', 0),
      knownDue('vocab.w3', '2026-08-10', 2),
      knownDue('vocab.t1', '2026-08-15', 1),
      knownDue('vocab.t2', '2026-08-15', 1),
    );

    // When
    const ordered = dueOrder(set, progress, kinds, seededRng(3));
    const again = dueOrder(set, progress, kinds, seededRng(3));

    // Then
    expect(ordered.itemIds.slice(0, 3)).toEqual(['vocab.w1', 'vocab.w2', 'vocab.w3']);
    expect([...ordered.itemIds.slice(3)].sort()).toEqual(['vocab.t1', 'vocab.t2']);
    expect(again.itemIds).toEqual(ordered.itemIds);
  });

  it('alternates words and phrases while both lists run, and the exercises follow', () => {
    // Given
    const kinds = poolOf({
      'vocab.w1': 'vocab',
      'vocab.w2': 'vocab',
      'vocab.w3': 'vocab',
      'phrase.p1': 'phrase',
      'phrase.p2': 'phrase',
    }).itemKinds;
    const set = setOf(
      ['phrase.p2', 'vocab.w2', 'phrase.p1', 'vocab.w1', 'vocab.w3'],
      [meaningPick('ex.p1', 'phrase.p1', 'phrase'), meaningPick('ex.w1', 'vocab.w1')],
    );
    const progress = progressOf(
      knownDue('vocab.w1', '2026-08-10'),
      knownDue('vocab.w2', '2026-08-11'),
      knownDue('vocab.w3', '2026-08-12'),
      knownDue('phrase.p1', '2026-08-13'),
      knownDue('phrase.p2', '2026-08-14'),
    );

    // When
    const ordered = dueOrder(set, progress, kinds, seededRng(3));

    // Then
    expect(ordered.itemIds).toEqual(['vocab.w1', 'phrase.p1', 'vocab.w2', 'phrase.p2', 'vocab.w3']);
    expect(ordered.exercises.map(e => e.id)).toEqual(['ex.w1', 'ex.p1']);
  });
});

describe('routeForSet', () => {
  it('routes zero to empty, one and two to the deck, three to the picker', () => {
    // Then
    expect(routeForSet(setOf([]))).toBe('empty');
    expect(routeForSet(setOf(['vocab.a']))).toBe('flashcards');
    expect(routeForSet(setOf(['vocab.a', 'vocab.b']))).toBe('flashcards');
    expect(routeForSet(setOf(['vocab.a', 'vocab.b', 'vocab.c']))).toBe('picker');
  });
});
