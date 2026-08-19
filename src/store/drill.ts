/**
 * @fileoverview The running drill — session state for the practice runner.
 *
 * `start` resolves the pool through the container, applies the selection, and
 * decides the route (docs/03 §4.6): an empty set is said, a set of 1–2 goes
 * straight to flashcards, anything else may pick a mode. With a mode it also
 * seeds the runner — a deck for flashcards, an engine session for everything
 * else. `startReview` is Q2: pool everything, selection due today, the
 * recognition drills interleaved in the scheduler's order.
 *
 * The moving parts mirror `./session.ts`: one seeded rng and one resolved
 * ProgressStore per session, a committing latch that drops a tap delivered
 * mid-commit, and every fold forwarded to `useProgress` so the browse screens
 * go live with no extra wiring.
 *
 * Exams (X1–X5) start here too, as `start` with the `recognise-mixed` mode and
 * a `sample` — docs/07 2026-08-16: an exam is this drill machine with pool =
 * the section. Nothing parks: leaving an exam drops the session, and a retake
 * is a fresh start on a fresh rng — a different paper. ASSUMPTION, flagged for
 * docs/07: exam answers feed the scheduler through the same `commit` fold as
 * every drill — the docs are silent, and parity is the honest default.
 */

import {create} from 'zustand';

import {toIsoDate} from '../domain/date';
import type {Progress, ProgressStore} from '../ports/progress-store';

import {audio, content, progress as progressStore} from '../composition/container';
import type {DrillModeId} from '../usecases/drill-modes';
import {
  createDeck,
  createSession,
  dueOrder,
  planDrill,
  planExam,
  planFlashcards,
  routeForSet,
  seededRng,
  selectSet,
  type DrillRoute,
  type DrillSelection,
  type FlashDeckState,
  type FlashRating,
  type Rng,
  type SessionState,
} from '../usecases/drill-plan';
import {gatherPool, type DrillPool, type DrillPoolRef, type DrillSet} from '../usecases/drill-pool';
import type {PlanContext} from '../usecases/exercise-seed';
import {type CommitInput} from '../usecases/submit-answer';
import {submitDrillAnswer, submitFlashRating} from '../usecases/submit-drill-answer';
import {useProgress} from './progress';
import {useSettings} from './settings';

/** The fallback when hydration is unavailable: a first-launch record. */
const EMPTY_PROGRESS: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/**
 * What `start` may run: a registered mode, or the exam's mixed recognition —
 * both recognise modes planned together (`planExam`).
 */
export type DrillStartMode = DrillModeId | 'recognise-mixed';

export type DrillStartOptions = {
  /** Draw this many questions seeded-randomly — the exam knob (§4.6). */
  readonly sample?: number;
};

type DrillSessionSlice = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** The runner the session was started for; null for a picker's read. */
  mode: DrillStartMode | null;
  /** Where the resolved set routes; the picker redirects off it. */
  route: DrillRoute | null;
  pool: DrillPool | null;
  set: DrillSet | null;
  /** The engine session — every mode but flashcards runs on it. */
  state: SessionState | null;
  /** The flashcard deck, when the mode is flashcards. */
  deck: FlashDeckState | null;
  /**
   * Resolve the pool and the set, and seed the runner when `mode` is given.
   * With `mode` null only the route decision is made — the picker's read.
   */
  start(
    ref: DrillPoolRef,
    selection: DrillSelection,
    mode: DrillStartMode | null,
    opts?: DrillStartOptions,
  ): Promise<void>;
  /** Q2: everything due today, recognition drills in the scheduler's order. */
  startReview(): Promise<void>;
  commit(input: CommitInput): Promise<void>;
  rate(rating: FlashRating): Promise<void>;
  reset(): void;
};

/** One rng per running session, so a drill's chance is drawn once. */
let sessionRng: Rng = seededRng(0);

/** The progress store, resolved once in `start` and reused by every fold. */
let store: ProgressStore | null = null;

/** A commit is running; a tap delivered meanwhile is dropped, not queued. */
let committing = false;

type Resolved = {
  readonly pool: DrillPool;
  readonly ctx: PlanContext;
  readonly progress: Progress;
};

/** The shared head of both starts: ports, context and the gathered pool. */
async function resolve(ref: DrillPoolRef): Promise<Resolved> {
  await useProgress
    .getState()
    .hydrate()
    .catch(() => {});
  sessionRng = seededRng(Date.now());
  const [source, progressPort, audioPort] = await Promise.all([
    content(),
    progressStore(),
    audio(),
  ]);
  store = progressPort;
  const audioAvailable = await audioPort.isAvailable();
  // Settings pre-hydration reads null; the default keeps today's behaviour.
  const audioFree = useSettings.getState().settings?.audioFree ?? false;
  const pool = await gatherPool({walk: source, exercises: source, dictionary: source}, ref);
  const progress = useProgress.getState().progress ?? EMPTY_PROGRESS;
  return {pool, ctx: {audioAvailable, audioFree}, progress};
}

export const useDrillSession = create<DrillSessionSlice>()((set, get) => ({
  status: 'idle',
  mode: null,
  route: null,
  pool: null,
  set: null,
  state: null,
  deck: null,

  async start(ref, selection, mode, opts = {}) {
    set({status: 'loading', mode, route: null, pool: null, set: null, state: null, deck: null});
    try {
      const {pool, ctx, progress} = await resolve(ref);
      const drillSet = selectSet(pool, selection, progress, toIsoDate(new Date()));
      const route = routeForSet(drillSet);
      if (mode === null) {
        set({status: 'ready', route, pool, set: drillSet});
        return;
      }
      if (mode === 'flashcards') {
        const deck = createDeck(planFlashcards(drillSet), sessionRng);
        set({status: 'ready', route, pool, set: drillSet, deck});
        return;
      }
      const seed =
        mode === 'recognise-mixed'
          ? planExam(drillSet, ctx, sessionRng, opts.sample ?? drillSet.itemIds.length)
          : planDrill(
              drillSet,
              mode,
              ctx,
              sessionRng,
              opts.sample === undefined ? {} : {sample: opts.sample},
            );
      set({status: 'ready', route, pool, set: drillSet, state: createSession(seed, sessionRng)});
    } catch {
      set({status: 'error'});
    }
  },

  async startReview() {
    set({
      status: 'loading',
      mode: null,
      route: null,
      pool: null,
      set: null,
      state: null,
      deck: null,
    });
    try {
      const {pool, ctx, progress} = await resolve({kind: 'everything'});
      const due = selectSet(pool, 'due-today', progress, toIsoDate(new Date()));
      const ordered = dueOrder(due, progress, pool.itemKinds, sessionRng);
      // The two recognition modes plan separately; merging by the ordered set's
      // own ranks restores the scheduler's word–phrase interleave (§4.6 Q2).
      const words = planDrill(ordered, 'word-recognise', ctx, sessionRng, {order: 'due'});
      const phrases = planDrill(ordered, 'phrase-recognise', ctx, sessionRng, {order: 'due'});
      const at = new Map(ordered.itemIds.map((itemId, index) => [itemId, index]));
      const drills = [...words.positions, ...phrases.positions]
        .filter(position => position.kind === 'exercise')
        .sort(
          (a, b) =>
            (at.get(a.exercise.itemId ?? '') ?? at.size) -
            (at.get(b.exercise.itemId ?? '') ?? at.size),
        );
      const seed = {
        ...words,
        stopId: 'drill:review',
        positions: [...drills, {kind: 'end' as const, capabilities: []}],
      };
      set({
        status: 'ready',
        route: routeForSet(ordered),
        pool,
        set: ordered,
        state: createSession(seed, sessionRng),
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
      const result = await submitDrillAnswer(
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

  async rate(rating) {
    const deck = get().deck;
    if (deck === null || store === null || committing) {
      return;
    }
    committing = true;
    try {
      const before = useProgress.getState().progress ?? EMPTY_PROGRESS;
      const result = await submitFlashRating({store}, before, deck, rating, toIsoDate(new Date()));
      set({deck: result.state});
      if (result.progress !== before) {
        useProgress.getState().apply(result.progress);
      }
      result.persisted.catch(() => {});
    } finally {
      committing = false;
    }
  },

  reset() {
    set({status: 'idle', mode: null, route: null, pool: null, set: null, state: null, deck: null});
  },
}));

/**
 * The summary's worth-another-look ids. A drill has no second look, so the
 * engine's misses are read directly; the deck's memory is `ratedAgain`.
 */
export function selectWorthAnotherLook(
  state: SessionState | null,
  deck: FlashDeckState | null,
): readonly string[] {
  if (state !== null) {
    return [...new Set(state.misses.map(miss => miss.itemId))];
  }
  return deck?.ratedAgain ?? [];
}
