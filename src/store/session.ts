/**
 * @fileoverview The running stop — session state for the lesson screen.
 *
 * `start` loads through the container, plans, and holds one seeded rng for the
 * whole session. `commit` updates the session synchronously before awaiting the
 * save, so the UI never waits on storage, and forwards the persisted snapshot to
 * `useProgress` — which is how the map, the shelves and the stats go live with no
 * browse-code change.
 */

import {create} from 'zustand';

import {toIsoDate} from '../domain/date';
import type {ContentItemId, StopId} from '../ports/content-ids';
import type {PhraseItem, Stop, VocabularyItem} from '../ports/content-model';
import type {Progress} from '../ports/progress-store';

import {content, progress as progressStore} from '../composition/container';
import {seededRng, startStop, type Rng, type SessionState} from '../usecases/start-stop';
import {submitAnswer, type CommitInput} from '../usecases/submit-answer';
import {useProgress} from './progress';

/**
 * The fallback when hydration is unavailable (no native store on this
 * platform): a first-launch record. Version 2 matches the stored shape that
 * `Progress` currently documents.
 */
const EMPTY_PROGRESS: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

type StopSessionSlice = {
  status: 'idle' | 'loading' | 'ready';
  stop: Stop | null;
  state: SessionState | null;
  itemsById: ReadonlyMap<ContentItemId, VocabularyItem | PhraseItem>;
  start(id: StopId): Promise<void>;
  commit(input: CommitInput): Promise<void>;
  reset(): void;
};

/** One rng per running session, so a stop's chance is drawn once. */
let sessionRng: Rng = seededRng(0);

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
    const source = await content();
    const session = await startStop(
      {walk: source, exercises: source, dictionary: source},
      id,
      sessionRng,
    );
    set({status: 'ready', stop: session.stop, state: session.state, itemsById: session.itemsById});
  },

  async commit(input) {
    const state = get().state;
    if (state === null) {
      return;
    }
    const before = useProgress.getState().progress ?? EMPTY_PROGRESS;
    const store = await progressStore();
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
  },

  reset() {
    set({status: 'idle', stop: null, state: null, itemsById: new Map()});
  },
}));
