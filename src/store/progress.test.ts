/**
 * @fileoverview The progress snapshot slice — hydrate once, read synchronously,
 * write through `apply`. Selectors default to a first-launch answer before
 * hydration. Phases per `docs/11-testing-conventions.md`.
 */

import {beforeEach, describe, expect, it} from 'vitest';

import type {IsoDate} from '../domain/date';
import {markTaught, newItem, recordMiss, type ItemId} from '../domain/item';
import type {Progress, ProgressStore} from '../ports/progress-store';

import {override, resetContainer} from '../composition/container';
import {
  selectCounts,
  selectItemState,
  selectStillGetting,
  selectStopDone,
  useProgress,
} from './progress';

const TODAY = '2026-08-19' as IsoDate;
const WORD = 'vocab.tashi-delek' as ItemId;

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** A store double that counts loads, so hydrate-once is assertable. */
function fakeStore(initial: Progress): ProgressStore & {loads: () => number} {
  let loads = 0;
  return {
    async load() {
      loads += 1;
      return initial;
    },
    async save() {},
    async export() {
      return '';
    },
    async clear() {},
    loads: () => loads,
  };
}

beforeEach(() => {
  resetContainer();
  useProgress.setState({progress: null});
});

describe('hydrate', () => {
  it('loads the stored snapshot once', async () => {
    // Given
    const store = fakeStore({...EMPTY, walkedOn: ['2026-08-18']});
    override('progress', store);

    // When
    await useProgress.getState().hydrate();
    await useProgress.getState().hydrate();

    // Then
    expect(useProgress.getState().progress?.walkedOn).toEqual(['2026-08-18']);
    expect(store.loads()).toBe(1);
  });
});

describe('apply', () => {
  it('replaces the snapshot with what a use case persisted', () => {
    // Given
    const next: Progress = {...EMPTY, walkedOn: [TODAY]};

    // When
    useProgress.getState().apply(next);

    // Then
    expect(useProgress.getState().progress).toBe(next);
  });
});

describe('selectors', () => {
  it('answers new for everything before hydration', () => {
    // When
    const state = selectItemState(null, WORD);
    const counts = selectCounts(null, [WORD]);

    // Then
    expect(state).toBe('new');
    expect(counts).toEqual({new: 1, met: 0, known: 0});
  });

  it('reads an item state off the snapshot', () => {
    // Given
    const progress: Progress = {...EMPTY, items: {[WORD]: markTaught(newItem(WORD))}};

    // When
    const state = selectItemState(progress, WORD);

    // Then
    expect(state).toBe('met');
  });

  it('counts states across the given ids', () => {
    // Given
    const other = 'vocab.cha' as ItemId;
    const progress: Progress = {...EMPTY, items: {[WORD]: markTaught(newItem(WORD))}};

    // When
    const counts = selectCounts(progress, [WORD, other]);

    // Then
    expect(counts).toEqual({new: 1, met: 1, known: 0});
  });

  it('lists the items still getting missed', () => {
    // Given — two misses inside the window
    const missed = recordMiss(
      recordMiss(markTaught(newItem(WORD)), '2026-08-17' as IsoDate),
      '2026-08-18' as IsoDate,
    );
    const progress: Progress = {...EMPTY, items: {[WORD]: missed}};

    // When
    const still = selectStillGetting(progress, [WORD], TODAY);

    // Then
    expect(still).toEqual([WORD]);
  });

  it('knows which stops are done', () => {
    // Given
    const progress: Progress = {...EMPTY, completedStops: ['stop.core.c1.1']};

    // When
    const done = selectStopDone(progress, 'stop.core.c1.1');

    // Then
    expect(done).toBe(true);
    expect(selectStopDone(progress, 'stop.core.c1.2')).toBe(false);
    expect(selectStopDone(null, 'stop.core.c1.1')).toBe(false);
  });
});
