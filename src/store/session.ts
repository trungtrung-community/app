/**
 * @fileoverview The running stop — session state for the lesson screen.
 *
 * `start` loads through the container, plans, and holds one seeded rng and one
 * resolved ProgressStore for the whole session. It also asks the app-state
 * store for a parked session: a snapshot cut for this stop against this
 * content version restores in place of the fresh state, and `resumed` is what
 * the screen keys the S4·r interstitial on. `commit` sets the next session
 * state without waiting on storage — the save runs behind it — and forwards the
 * computed snapshot to `useProgress`, which is how the map, the shelves and the
 * stats go live with no browse-code change. Each commit also parks the session
 * fire-and-forget; the ending commit clears the park instead, so a finished
 * stop never re-enters part-walked. One commit runs at a time: a tap delivered
 * while a commit is in flight is dropped, which manual advance makes correct.
 *
 * `reset` clears memory only, never the parked snapshot — P4 promises the
 * place is kept, and the screen resets on every unmount, leaving included.
 */

import {create} from 'zustand';

import {toIsoDate} from '../domain/date';
import type {AppStateStore} from '../ports/app-state-store';
import type {ContentItemId, StopId} from '../ports/content-ids';
import type {Stop} from '../ports/content-model';
import type {ContentSource} from '../ports/content-source';
import type {Progress, ProgressStore} from '../ports/progress-store';

import {appState, audio, content, progress as progressStore} from '../composition/container';
import {findArtifactCards, type ArtifactCard} from '../usecases/find-artifact-card';
import {restoreSnapshot, snapshotOf} from '../usecases/resume-stop';
import {
  seededRng,
  startStop,
  type Rng,
  type SessionItem,
  type SessionState,
} from '../usecases/start-stop';
import {afterStop, type Ceremony} from '../usecases/stop-ceremony';
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
  itemsById: ReadonlyMap<ContentItemId, SessionItem>;
  /** A parked session was restored; the screen shows S4·r before the queue. */
  resumed: boolean;
  /** The stop's artifacts as shelf cards, resolved at start for the G4 sheet. */
  artifactCards: readonly ArtifactCard[];
  start(id: StopId): Promise<void>;
  commit(input: CommitInput): Promise<void>;
  /** The ending commit, and the answer to what comes after the stop's own end. */
  finish(): Promise<Ceremony>;
  reset(): void;
};

/** One rng per running session, so a stop's chance is drawn once. */
let sessionRng: Rng = seededRng(0);

/** The progress store, resolved once in `start` and reused by every commit. */
let store: ProgressStore | null = null;

/** The app-state store, resolved once in `start`; every commit parks through it. */
let parkStore: AppStateStore | null = null;

/** The content source of the running session, for the ceremony's walk reads. */
let source: ContentSource | null = null;

/** The content lock version the running session was cut against. */
let contentVersion: string | null = null;

/** A commit is running; a tap delivered meanwhile is dropped, not queued. */
let committing = false;

/**
 * Park or clear the snapshot behind the commit that produced `state`.
 *
 * Fire-and-forget by design: the session is already live in memory, and a
 * failed park must not take the turn down. An ended session clears the park —
 * finished is finished.
 */
function park(state: SessionState): void {
  const target = parkStore;
  const version = contentVersion;
  if (target === null || version === null) {
    return;
  }
  void target
    .load()
    .then(current =>
      target.save({
        ...current,
        session:
          state.phase === 'ended'
            ? null
            : snapshotOf(state.stopId, version, state, new Date().toISOString()),
      }),
    )
    .catch(() => {});
}

export const useStopSession = create<StopSessionSlice>()((set, get) => ({
  status: 'idle',
  stop: null,
  state: null,
  itemsById: new Map(),
  resumed: false,
  artifactCards: [],

  async start(id) {
    set({
      status: 'loading',
      stop: null,
      state: null,
      itemsById: new Map(),
      resumed: false,
      artifactCards: [],
    });
    await useProgress
      .getState()
      .hydrate()
      .catch(() => {});
    sessionRng = seededRng(Date.now());
    try {
      // The app-state store is continuity, not correctness: a platform without
      // one still walks the stop — it only re-enters from the start.
      const [contentSource, progressPort, audioPort, appStatePort] = await Promise.all([
        content(),
        progressStore(),
        audio(),
        appState().catch(() => null),
      ]);
      store = progressPort;
      parkStore = appStatePort;
      source = contentSource;
      // Settings pre-hydration reads null; the default keeps today's behaviour.
      const audioFree = useSettings.getState().settings?.audioFree ?? false;
      const [session, version, parked] = await Promise.all([
        startStop(
          {
            walk: contentSource,
            exercises: contentSource,
            dictionary: contentSource,
            script: contentSource,
            audio: audioPort,
          },
          id,
          sessionRng,
          {audioFree},
        ),
        // Deferred onto the microtask queue: a source that throws synchronously
        // here must reject INSIDE the all(), or the session promise beside it
        // would be orphaned as an unhandled rejection. Null on failure — no
        // version means no parking and no resume, never no session.
        Promise.resolve()
          .then(() => contentSource.contentVersion())
          .catch((): null => null),
        appStatePort === null
          ? Promise.resolve(null)
          : appStatePort.load().then(
              loaded => loaded.session,
              () => null,
            ),
      ]);
      contentVersion = version;
      const restored =
        version === null ? null : restoreSnapshot(parked, {stopId: id, contentVersion: version});
      // The G4 sheet is a reward, not a gate: an unreadable shelf skips it.
      const artifactCards = await findArtifactCards(
        {collections: contentSource},
        session.artifacts,
      ).catch((): readonly ArtifactCard[] => []);
      set({
        status: 'ready',
        stop: session.stop,
        state: restored ?? session.state,
        itemsById: session.itemsById,
        resumed: restored !== null,
        artifactCards,
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
      park(result.state);
    } finally {
      committing = false;
    }
  },

  async finish() {
    await get().commit({kind: 'finish'});
    const stop = get().stop;
    const walk = source;
    const progress = useProgress.getState().progress;
    if (stop === null || walk === null || progress === null) {
      return {kind: 'none'};
    }
    // A ceremony that cannot be computed is a ceremony that does not run —
    // the stop still closes normally.
    try {
      return await afterStop({walk}, progress, stop);
    } catch {
      return {kind: 'none'};
    }
  },

  reset() {
    set({
      status: 'idle',
      stop: null,
      state: null,
      itemsById: new Map(),
      resumed: false,
      artifactCards: [],
    });
  },
}));
