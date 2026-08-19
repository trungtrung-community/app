/**
 * @fileoverview The running stop — session state for the lesson screen.
 *
 * `start` loads through the container, plans, and holds one seeded rng and one
 * resolved ProgressStore for the whole session. `commit` sets the next session
 * state without waiting on storage — the save runs behind it — and forwards the
 * computed snapshot to `useProgress`, which is how the map, the shelves and the
 * stats go live with no browse-code change. One commit runs at a time: a tap
 * delivered while a commit is in flight is dropped, which manual advance makes
 * correct.
 */

import {create} from 'zustand';

import {toIsoDate} from '../domain/date';
import type {ContentItemId, StopId} from '../ports/content-ids';
import type {PhraseItem, Stop, VocabularyItem} from '../ports/content-model';
import type {Progress, ProgressStore} from '../ports/progress-store';

import {audio, content, progress as progressStore} from '../composition/container';
import {seededRng, startStop, type Rng, type SessionState} from '../usecases/start-stop';
import {submitAnswer, type CommitInput} from '../usecases/submit-answer';
import {useProgress} from './progress';
import {useSettings} from './settings';

/**
 * The fallback when hydration is unavailable (no native store on this
 * platform): a first-launch record. Version 2 matches the stored shape that
 * `Progress` currently documents.
 */
const EMPTY_PROGRESS: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

type StopSessionSlice = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  stop: Stop | null;
  state: SessionState | null;
  itemsById: ReadonlyMap<ContentItemId, VocabularyItem | PhraseItem>;
  start(id: StopId): Promise<void>;
  commit(input: CommitInput): Promise<void>;
  reset(): void;
};

/** One rng per running session, so a stop's chance is drawn once. */
let sessionRng: Rng = seededRng(0);

/** The progress store, resolved once in `start` and reused by every commit. */
let store: ProgressStore | null = null;

/** A commit is running; a tap delivered meanwhile is dropped, not queued. */
let committing = false;

export const useStopSession = create<StopSessionSlice>()((set, get) => ({
  status: 'idle',
  stop: null,
  state: null,
  itemsById: new Map(),

  async start(id) {
    set({status: 'loading', stop: null, state: null, itemsById: new Map()});
    await useProgress
      .getState()
      .hydrate()
      .catch(() => {});
    sessionRng = seededRng(Date.now());
    try {
      const [source, progressPort, audioPort] = await Promise.all([
        content(),
        progressStore(),
        audio(),
      ]);
      store = progressPort;
      // Settings pre-hydration reads null; the default keeps today's behaviour.
      const audioFree = useSettings.getState().settings?.audioFree ?? false;
      const session = await startStop(
        {walk: source, exercises: source, dictionary: source, audio: audioPort},
        id,
        sessionRng,
        {audioFree},
      );
      set({
        status: 'ready',
        stop: session.stop,
        state: session.state,
        itemsById: session.itemsById,
      });
    } catch {
      set({status: 'error'});
    }
  },

  async commit(input) {
    const state = get().state;
    if (state === null || store === null || committing) {
      return;
    }
    committing = true;
    try {
      const before = useProgress.getState().progress ?? EMPTY_PROGRESS;
      const result = await submitAnswer(
        {store},
        before,
        state,
        input,
        sessionRng,
        toIsoDate(new Date()),
      );
      set({state: result.state});
      if (result.progress !== before) {
        useProgress.getState().apply(result.progress);
      }
      // The snapshot is already live; a failed save must not take the turn down.
      result.persisted.catch(() => {});
    } finally {
      committing = false;
    }
  },

  reset() {
    set({status: 'idle', stop: null, state: null, itemsById: new Map()});
  },
}));
