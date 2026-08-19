/**
 * @fileoverview The named case from docs/11 §2: the learner submits the final
 * answer; does the use case advance the engine and persist progress?
 *
 * Real fixture, real JSON adapter, a memory ProgressStore, a seeded rng — the
 * whole loop with no doubles inside the boundary. Phases per docs/11.
 *
 * The fixture-wide planner assertions live here too, not beside `planSession`:
 * they cross the planner, the adapter and the shipped fixture, and the
 * dependency rules bar a use-case test from importing infra.
 */

import {describe, expect, it, vi} from 'vitest';

import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import {override, resetContainer} from '../../src/composition/container';
import {
  DEFAULT_APP_STATE,
  type AppState,
  type AppStateStore,
} from '../../src/ports/app-state-store';
import {useProgress} from '../../src/store/progress';
import {useStopSession} from '../../src/store/session';

import {isoDate} from '../../src/domain/date';
import {seededRng} from '../../src/engine/rng';
import type {SessionState} from '../../src/engine/session';
import type {CommitInput} from '../../src/engine/commit';
import type {Exercise} from '../../src/ports/content-exercise';
import type {StopId} from '../../src/ports/content-ids';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';
import {planSession, type PlanContext} from '../../src/usecases/session-plan';
import {startStop} from '../../src/usecases/start-stop';
import {submitAnswer} from '../../src/usecases/submit-answer';

const STOP_ID = 'stop.core.c1.1' as StopId;
const TODAY = isoDate('2026-08-19');
const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

function memoryStore(): ProgressStore & {saved: () => Progress | null} {
  let last: Progress | null = null;
  return {
    async load() {
      return last ?? EMPTY;
    },
    async save(progress) {
      last = progress;
    },
    async export() {
      return JSON.stringify(last);
    },
    async clear() {
      last = null;
    },
    saved: () => last,
  };
}

/** What a learner would do at the current entry, answering per `answer`. */
function nextInput(state: SessionState, answer: 'right' | 'wrong'): CommitInput {
  const entry = state.queue[state.index];
  if (entry === undefined) {
    throw new Error('walked past the end of the queue');
  }
  if (state.answered !== null) {
    return {kind: 'continue'};
  }
  if (entry.position.kind === 'end') {
    return {kind: 'finish'};
  }
  if (entry.position.kind !== 'exercise') {
    return {kind: 'continue'};
  }
  const exercise = entry.position.exercise;
  if (exercise.commitMode === 'pairs') {
    const unmatched = exercise.options.find(option => !state.matched.includes(option.itemId));
    return {kind: 'pair', a: unmatched?.itemId ?? '', b: unmatched?.itemId ?? ''};
  }
  const options = entry.options ?? exercise.options;
  const pick =
    answer === 'right'
      ? options.find(option => option.isAnswer)
      : options.find(option => !option.isAnswer);
  return {kind: 'tap', itemId: pick?.itemId ?? ''};
}

type Walked = {state: SessionState; progress: Progress};

async function walk(
  store: ProgressStore,
  decide: (state: SessionState) => 'right' | 'wrong',
): Promise<Walked> {
  const source = new JsonContentSource(fixture as unknown as ContentFixture);
  const session = await startStop(
    {
      walk: source,
      exercises: source,
      dictionary: source,
      script: source,
      audio: {isAvailable: async () => false},
    },
    STOP_ID,
    seededRng(42),
    {audioFree: false},
  );
  let state = session.state;
  let progress = EMPTY;
  let guard = 0;
  while (state.phase === 'running') {
    if (guard++ > 500) {
      throw new Error('the session never ended');
    }
    const input = nextInput(state, decide(state));
    const result = await submitAnswer({store}, progress, state, input, seededRng(guard), TODAY);
    state = result.state;
    progress = result.progress;
  }
  return {state, progress};
}

describe('walking stop.core.c1.1 end to end', () => {
  it('advances the engine and persists progress on a clean run', async () => {
    // Given
    const store = memoryStore();

    // When — every answer right
    const {state, progress} = await walk(store, () => 'right');

    // Then — 42 scripted positions minus the 5 audio-hidden drills
    expect(state.phase).toBe('ended');
    expect(state.queue.length).toBe(37);
    const met = Object.values(progress.items).filter(item => item.state === 'met');
    expect(met.length).toBe(12); // 8 words + 4 phrases taught by their cards
    expect(progress.walkedOn).toEqual([TODAY]);
    expect(progress.completedStops).toEqual([STOP_ID]);
    expect(state.stillMissed).toEqual([]);

    // Then — the snapshot round-trips through the store
    expect(store.saved()).toEqual(progress);
    expect(await store.load()).toEqual(progress);
  });

  it('returns a miss through the re-queue and the second look, and the total only grows', async () => {
    // Given — miss every first meeting of one presentation, recover nowhere
    const store = memoryStore();
    let firstExerciseKey: string | null = null;
    const totals: number[] = [];

    // When — wrong on the first exercise every time it comes back, right elsewhere
    const {state, progress} = await walk(store, current => {
      totals.push(current.queue.length);
      const entry = current.queue[current.index];
      if (entry?.position.kind !== 'exercise') {
        return 'right';
      }
      if (firstExerciseKey === null) {
        firstExerciseKey = entry.position.exercise.exerciseId;
      }
      const exercise = entry.position.exercise;
      const target = current.queue.find(
        candidate =>
          candidate.position.kind === 'exercise' &&
          candidate.position.exercise.exerciseId === firstExerciseKey,
      );
      const missedItem =
        target?.position.kind === 'exercise' ? target.position.exercise.itemId : null;
      return exercise.itemId === missedItem && exercise.commitMode === 'tap' ? 'wrong' : 'right';
    });

    // Then — the session still ended, the item is on the summary's quiet list
    expect(state.phase).toBe('ended');
    expect(state.stillMissed.length).toBe(1);
    expect(state.secondLookAdded).toBe(true);
    expect(totals.every((v, i) => i === 0 || v >= (totals[i - 1] ?? 0))).toBe(true);

    // Then — the misses reached the persisted record
    const missedId = state.stillMissed[0] ?? '';
    expect(progress.items[missedId]?.missedOn).toEqual([TODAY]);
    expect(progress.completedStops).toEqual([STOP_ID]);
  });
});

function memoryAppState(): AppStateStore & {current: () => AppState} {
  let last = DEFAULT_APP_STATE;
  return {
    async load() {
      return last;
    },
    async save(state) {
      last = state;
    },
    current: () => last,
  };
}

describe('parking and resuming through the session store', () => {
  it('resumes a parked commit after a kill, and finishing clears the park', async () => {
    // Given — one device: the app-state store survives, the session slice does not
    const appStates = memoryAppState();
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    override('progress', memoryStore());
    override('appState', appStates);
    useProgress.setState({progress: null});
    useStopSession.getState().reset();

    // When — the learner steps inside, which is the first commit
    await useStopSession.getState().start(STOP_ID);
    expect(useStopSession.getState().resumed).toBe(false);
    await useStopSession.getState().commit({kind: 'continue'});

    // Then — the place is parked behind the commit
    await vi.waitFor(() => {
      expect(appStates.current().session).not.toBeNull();
    });

    // When — the process dies and the stop is entered again
    useStopSession.getState().reset();
    await useStopSession.getState().start(STOP_ID);

    // Then — the place was kept: same stop, same index, resumed for S4·r
    expect(useStopSession.getState().resumed).toBe(true);
    expect(useStopSession.getState().state?.index).toBe(1);

    // When — the session runs to its end and finishes
    const restored = useStopSession.getState().state;
    if (restored === null) {
      throw new Error('resumed without a session state');
    }
    const endAt = restored.queue.findIndex(entry => entry.position.kind === 'end');
    expect(endAt).toBeGreaterThan(-1);
    useStopSession.setState({state: {...restored, index: endAt}});
    const ceremony = await useStopSession.getState().finish();

    // Then — no ceremony off one stop, the park is cleared, re-entry is fresh
    expect(ceremony).toEqual({kind: 'none'});
    await vi.waitFor(() => {
      expect(appStates.current().session).toBeNull();
    });
    useStopSession.getState().reset();
    await useStopSession.getState().start(STOP_ID);
    expect(useStopSession.getState().resumed).toBe(false);
    expect(useStopSession.getState().state?.index).toBe(0);
  });

  it('refuses a snapshot cut against a different content version', async () => {
    // Given — a parked session whose contentVersion has moved on
    const appStates = memoryAppState();
    resetContainer();
    const source = new JsonContentSource(fixture as unknown as ContentFixture);
    override('content', source);
    override('progress', memoryStore());
    override('appState', appStates);
    useProgress.setState({progress: null});
    useStopSession.getState().reset();
    await useStopSession.getState().start(STOP_ID);
    await useStopSession.getState().commit({kind: 'continue'});
    await vi.waitFor(() => {
      expect(appStates.current().session).not.toBeNull();
    });
    const parked = appStates.current().session;
    if (parked === null) {
      throw new Error('nothing parked');
    }
    await appStates.save({
      ...appStates.current(),
      session: {...parked, contentVersion: 'someone-elses-build'},
    });

    // When
    useStopSession.getState().reset();
    await useStopSession.getState().start(STOP_ID);

    // Then — the honest fallback: the stop re-enters from the start
    expect(useStopSession.getState().resumed).toBe(false);
    expect(useStopSession.getState().state?.index).toBe(0);
  });
});

describe('planning the whole fixture', () => {
  const source = new JsonContentSource(fixture as unknown as ContentFixture);
  const stopIds = (fixture as unknown as ContentFixture).stop.map(row => row.id as StopId);

  /** Today's build: no recordings shipped, the audio-free switch off. */
  const TODAY_CTX: PlanContext = {audioAvailable: false, audioFree: false};

  /** What the stop screen rendered before the ladder landed. */
  const PRE_LADDER_RENDERABLE: ReadonlySet<string> = new Set([
    'meaning-pick',
    'meaning-pick-substitute',
    'phrase-recognise-script',
    'pair-match',
  ]);

  /** The pre-ladder rule, verbatim: substitute only while blockedOn says audio. */
  function preLadderPresentation(exercise: Exercise): string | null {
    const substituted =
      exercise.blockedOn === 'audio'
        ? exercise.type === 'listen-pick'
          ? 'meaning-pick-substitute'
          : exercise.type === 'phrase-recognise'
            ? 'phrase-recognise-script'
            : exercise.type
        : exercise.type;
    return PRE_LADDER_RENDERABLE.has(substituted) ? substituted : null;
  }

  type Decision = {readonly exerciseId: string; readonly presentation: string};

  /** Every stop's planned drills, in script order, under `ctx`. */
  async function planned(
    ctx: PlanContext,
    adjust: (exercise: Exercise) => Exercise = exercise => exercise,
  ): Promise<{decisions: Decision[]; byExercise: Map<string, Exercise>}> {
    const decisions: Decision[] = [];
    const byExercise = new Map<string, Exercise>();
    for (const stopId of stopIds) {
      const [script, exercises] = await Promise.all([
        source.getStopScript(stopId),
        source.listExercisesByStop(stopId),
      ]);
      const adjusted = exercises.map(adjust);
      for (const exercise of adjusted) {
        byExercise.set(exercise.id, exercise);
      }
      const seed = planSession(script, new Map(adjusted.map(e => [e.id, e])), ctx);
      for (const position of seed.positions) {
        if (position.kind === 'exercise') {
          decisions.push({
            exerciseId: position.exercise.exerciseId,
            presentation: position.exercise.presentation,
          });
        }
      }
    }
    return {decisions, byExercise};
  }

  it('plans today byte-identically to the pre-ladder rule, the see-it-say-it correction aside', async () => {
    // When
    const {decisions, byExercise} = await planned(TODAY_CTX);

    // Then — 430 drills: 363 as before, plus the four corrected see-it-say-it
    expect(decisions.length).toBe(367);
    for (const {exerciseId, presentation} of decisions) {
      const exercise = byExercise.get(exerciseId);
      expect(exercise).toBeDefined();
      if (exercise === undefined) {
        continue;
      }
      const expected =
        exercise.type === 'see-it-say-it' ? 'see-it-say-it' : preLadderPresentation(exercise);
      expect(`${exerciseId}:${presentation}`).toBe(`${exerciseId}:${expected}`);
    }
  });

  it('keeps every drill on screen when recordings land and blockedOn goes null', async () => {
    // Given — the day the pre-ladder rule would have vanished 184 drills
    const unblock = (exercise: Exercise): Exercise => ({...exercise, blockedOn: null});

    // When
    const {decisions, byExercise} = await planned(
      {audioAvailable: true, audioFree: false},
      unblock,
    );

    // Then — nothing vanished, and the audio types run their silent siblings
    expect(decisions.length).toBe(367);
    for (const {exerciseId, presentation} of decisions) {
      const type = byExercise.get(exerciseId)?.type;
      if (type === 'listen-pick') {
        expect(presentation).toBe('meaning-pick-substitute');
      }
      if (type === 'phrase-recognise') {
        expect(presentation).toBe('phrase-recognise-script');
      }
    }
  });

  it('renders the four see-it-say-it drills the commit-mode correction unhid', async () => {
    // When
    const {decisions, byExercise} = await planned(TODAY_CTX);

    // Then
    const seen = decisions.filter(d => byExercise.get(d.exerciseId)?.type === 'see-it-say-it');
    expect(seen.map(d => d.exerciseId).sort()).toEqual([
      'ex.1.1.005',
      'ex.1.1.006',
      'ex.1.1.007',
      'ex.1.1.008',
    ]);
    expect(seen.every(d => d.presentation === 'see-it-say-it')).toBe(true);
  });

  it('never surfaces phrase-arrange while REVIEW-2 stands, even unblocked with audio', async () => {
    // When
    const {decisions, byExercise} = await planned(
      {audioAvailable: true, audioFree: false},
      exercise => ({...exercise, blockedOn: null}),
    );

    // Then — 20 arrange drills in the fixture, none on screen
    const arranged = decisions.filter(d => byExercise.get(d.exerciseId)?.type === 'phrase-arrange');
    expect(arranged).toEqual([]);
  });

  it('lifts the artifact cards into the seed, off the queue and the bar', async () => {
    // Given — the two G4 cards sit after `end`, where no queue position renders
    const stopsWithCards: readonly [StopId, string][] = [
      ['stop.meeting.c1.5' as StopId, 'vocab.tibet'],
      ['stop.meeting.c1.6' as StopId, 'vocab.lhasa'],
    ];

    for (const [stopId, itemId] of stopsWithCards) {
      // When
      const [script, exercises] = await Promise.all([
        source.getStopScript(stopId),
        source.listExercisesByStop(stopId),
      ]);
      const seed = planSession(script, new Map(exercises.map(e => [e.id, e])), TODAY_CTX);

      // Then — the card is the only non-drill script position missing from the queue
      expect(seed.artifacts).toEqual([itemId]);
      expect(seed.positions.some(p => p.kind === 'card' && p.card === 'artifact')).toBe(false);
      const drillKinds = ['exercise', 'warm-up', 'assembly'];
      const nonDrillScript = script.filter(p => !drillKinds.includes(p.kind) && p.kind !== 'card');
      const drillsPlanned = seed.positions.filter(p => p.kind === 'exercise').length;
      expect(seed.positions.length).toBe(nonDrillScript.length + drillsPlanned);
    }
  });
});
