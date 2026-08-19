/**
 * @fileoverview The progress snapshot — hydrated once, read synchronously.
 *
 * Browse screens read this slice through the selectors below and never write it.
 * The one writer is the lesson use case: it computes the next `Progress` with the
 * `src/domain/item.ts` functions, saves through the `ProgressStore` port, then calls
 * `apply`. The slice never computes progression and never names a storage module.
 *
 * Before hydration every selector answers as a first launch would — everything
 * `new`, nothing done — so a screen is correct immediately and merely late for a
 * returning learner.
 */

import {create} from 'zustand';

import type {IsoDate} from '../domain/date';
import {countByState, isWorthAnotherLook, type ItemState} from '../domain/item';
import type {Progress} from '../ports/progress-store';

import {progress as progressStore} from '../composition/container';

type ProgressSlice = {
  /** The hydrated snapshot, or null until `hydrate` resolves. */
  progress: Progress | null;
  /** Load the stored snapshot, once. Later calls resolve without another load. */
  hydrate(): Promise<void>;
  /** Replace the snapshot with what a use case persisted. */
  apply(next: Progress): void;
};

/** The in-flight load, shared by concurrent hydrates and cleared when it settles. */
let loading: Promise<void> | null = null;

export const useProgress = create<ProgressSlice>()((set, get) => ({
  progress: null,
  hydrate() {
    if (get().progress !== null) {
      return Promise.resolve();
    }
    loading ??= (async () => {
      try {
        const store = await progressStore();
        const snapshot = await store.load();
        // An `apply` may have landed while the load ran; what a use case
        // persisted is newer than what the store held, so it wins.
        if (get().progress === null) {
          set({progress: snapshot});
        }
      } finally {
        loading = null;
      }
    })();
    return loading;
  },
  apply(next) {
    set({progress: next});
  },
}));

/**
 * The selectors take the snapshot as a value so they compose with the hook —
 * `useProgress(s => selectItemState(s.progress, id))` — and test as plain
 * functions.
 */
export function selectItemState(progress: Progress | null, id: string): ItemState {
  return progress?.items[id]?.state ?? 'new';
}

/** State counts over the given ids; an id with no record counts as `new`. */
export function selectCounts(
  progress: Progress | null,
  ids: readonly string[],
): Record<ItemState, number> {
  const known = ids.map(id => progress?.items[id]).filter(item => item !== undefined);
  const counts = countByState(known);
  return {...counts, new: counts.new + (ids.length - known.length)};
}

/** The ids on the "worth another look" list, in the given order. */
export function selectStillGetting(
  progress: Progress | null,
  ids: readonly string[],
  today: IsoDate,
): readonly string[] {
  return ids.filter(id => {
    const item = progress?.items[id];
    return item !== undefined && isWorthAnotherLook(item, today);
  });
}

export function selectStopDone(progress: Progress | null, stopId: string): boolean {
  return progress?.completedStops.includes(stopId) ?? false;
}
