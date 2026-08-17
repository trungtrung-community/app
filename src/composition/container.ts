/**
 * @fileoverview The only file that knows which adapter implements which port.
 *
 * This is where a migration lands. Serving audio from a backend means adding a
 * remote adapter and a caching decorator and changing the line below — no screen,
 * use case or rule changes. That is the whole return on the port seam, and it is
 * worth being precise that it holds best for audio, holds well for content, and
 * only localises rather than shrinks the work for progress.
 *
 * Adapters are created lazily and memoised. Two reasons, one architectural and one
 * immediate: nothing should pay for a subsystem it does not use, and
 * `react-native-mmkv` v4 is built on Nitro modules, which do not exist in Expo Go
 * — so constructing the progress store at import time would break a client that
 * never saves anything.
 */

import type {AudioSource, ContentSource, ProgressStore} from '../ports';

import {BundledAudioSource} from '../infra/audio/bundled-audio-source';
import {createMmkvProgressStore} from '../infra/progress/mmkv-progress-store';

type Container = {
  readonly progress: ProgressStore;
  readonly audio: AudioSource;
  /** Arrives in Phase 4, once the content pipeline emits its SQLite artifact. */
  readonly content: ContentSource;
};

const memo = new Map<keyof Container, unknown>();

function once<K extends keyof Container>(key: K, make: () => Container[K]): Container[K] {
  if (!memo.has(key)) {
    memo.set(key, make());
  }
  return memo.get(key) as Container[K];
}

export const container = {
  get progress(): ProgressStore {
    return once('progress', createMmkvProgressStore);
  },

  get audio(): AudioSource {
    return once('audio', () => new BundledAudioSource());
  },

  get content(): ContentSource {
    throw new Error(
      'No ContentSource yet. Phase 4 adds SqliteContentSource for native and ' +
        'JsonContentSource for web and tests; see docs/spikes and the plan.',
    );
  },
};

/**
 * Replace an adapter, for tests and for the specimen gallery.
 *
 * The gallery renders real content-spec vocabulary rather than placeholder text,
 * which is a design-system rule, so it needs to choose its own source.
 */
export function override<K extends keyof Container>(key: K, value: Container[K]): void {
  memo.set(key, value);
}

/** Drop every memoised adapter. Call between tests. */
export function resetContainer(): void {
  memo.clear();
}
