/**
 * @fileoverview The stop screen — the intro opens, a card teaches, the bar
 * stands over the whole run. The loop's depth is proven by the integration
 * suite; this asserts the screen's composition. Phases per docs/11.
 */

import {act, fireEvent, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Stop from '../../app/stop/[id]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import type {Cue} from '../../src/domain/cue';
import {markTaught, newItem, type ItemId} from '../../src/domain/item';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import {
  DEFAULT_APP_STATE,
  type AppState,
  type AppStateStore,
} from '../../src/ports/app-state-store';
import type {CuePlayer} from '../../src/ports/cue-player';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';
import {useProgress} from '../../src/store/progress';
import {useStopSession} from '../../src/store/session';
import type {SessionState} from '../../src/usecases/start-stop';

const {back, push, replace, params} = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  params: {id: 'stop.core.c1.1'},
}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => params,
  useRouter: () => ({back, push, replace}),
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

function memoryStore(): ProgressStore {
  let last = EMPTY;
  return {
    async load() {
      return last;
    },
    async save(progress) {
      last = progress;
    },
    async export() {
      return '';
    },
    async clear() {
      last = EMPTY;
    },
  };
}

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

/** A cue player that only counts. */
function countingCues(): CuePlayer & {played: () => readonly Cue[]} {
  const plays: Cue[] = [];
  return {
    async play(cue) {
      plays.push(cue);
    },
    async setPreferences() {},
    played: () => plays,
  };
}

/** Wait until the session slice is ready, then hand its state over. */
async function ready(): Promise<SessionState> {
  await waitFor(() => {
    expect(useStopSession.getState().status).toBe('ready');
  });
  const state = useStopSession.getState().state;
  if (state === null) {
    throw new Error('ready without a session state');
  }
  return state;
}

/** Jump the running session to `index`, as the engine would have arrived there. */
function jumpTo(state: SessionState, index: number, patch: Partial<SessionState> = {}): void {
  act(() => {
    useStopSession.setState({state: {...state, index, ...patch}});
  });
}

/**
 * The committed fixture with stop.1.1 additionally stating R-ROW. The build
 * teaches R-ROW outside the fixture's stops, so no completing stop can cross
 * the readable threshold as committed; one added rule card makes stop.1.1 the
 * stop whose end makes ཨ་ཁུ (word.a-khu) the first readable word.
 */
function crossingFixture(): ContentFixture {
  const rows = fixture as unknown as ContentFixture;
  return {
    ...rows,
    stop_position: [
      ...rows.stop_position,
      {
        stop_id: 'stop.1.1',
        n: 99,
        kind: 'rule-card',
        screen: 'C1',
        item_id: null,
        exercise_id: null,
        rule_id: 'R-ROW',
        text: 'Letters in the same row share a sound family.',
        payload_json: '{}',
      },
    ],
  };
}

/** ཨ and ཁ met, and the word said: everything B1 needs except the finished stop. */
function crossedLetters(): Progress {
  return {
    walkedOn: [],
    items: {
      'letter.a': markTaught(newItem('letter.a' as ItemId)),
      'letter.kha': markTaught(newItem('letter.kha' as ItemId)),
      'vocab.uncle': markTaught(newItem('vocab.uncle' as ItemId)),
    },
    completedStops: [],
    version: 2,
  };
}

describe('the stop screen', () => {
  let cues: ReturnType<typeof countingCues>;
  let appStates: ReturnType<typeof memoryAppState>;

  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    override('progress', memoryStore());
    cues = countingCues();
    override('cues', cues);
    appStates = memoryAppState();
    override('appState', appStates);
    useProgress.setState({progress: null});
    useStopSession.getState().reset();
    params.id = 'stop.core.c1.1';
    back.mockClear();
    push.mockClear();
    replace.mockClear();
  });

  it('opens on the intro with the way in', async () => {
    // When
    renderScreen(<Stop />);

    // Then
    expect(await screen.findByText('Hello, and a way out')).toBeTruthy();
    expect(screen.getByText('Step inside')).toBeTruthy();
    expect(screen.getByTestId('stop-progress')).toBeTruthy();
  });

  it('says the stop is off the map when it does not load', async () => {
    // Given — a content source whose loads all refuse
    const broken = {
      getStop: async () => {
        throw new Error('no such stop');
      },
      getStopScript: async () => {
        throw new Error('no such stop');
      },
      listExercisesByStop: async () => {
        throw new Error('no such stop');
      },
    } as unknown as JsonContentSource;
    override('content', broken);

    // When
    renderScreen(<Stop />);

    // Then
    expect(await screen.findByText('That stop is off the map')).toBeTruthy();
  });

  it('teaches the first word from its card', async () => {
    // Given
    renderScreen(<Stop />);
    const enter = await screen.findByText('Step inside');

    // When
    fireEvent.click(enter);

    // Then
    expect(await screen.findByText('trashi delek')).toBeTruthy();
    expect(screen.getByText(/New word/)).toBeTruthy();
  });

  it('marks each band with its cue exactly once', async () => {
    // Given
    renderScreen(<Stop />);
    const state = await ready();

    // When — a correct band, then an unrelated re-render, then a wrong band
    act(() => {
      useStopSession.setState({
        state: {...state, answered: {key: '2', verdict: 'correct', answerItemId: null}},
      });
    });
    act(() => {
      useStopSession.setState({
        state: {...state, answered: {key: '2', verdict: 'correct', answerItemId: null}},
      });
    });
    act(() => {
      useStopSession.setState({
        state: {...state, answered: {key: '3', verdict: 'wrong', answerItemId: null}},
      });
    });

    // Then — the cue path is asynchronous, so the count settles before it reads
    await waitFor(() => {
      expect(cues.played()).toEqual(['correct', 'wrong']);
    });
  });

  it('marks the run reaching three, and shows the count above the band', async () => {
    // Given
    renderScreen(<Stop />);
    const state = await ready();

    // When — the third correct in a row lands
    act(() => {
      useStopSession.setState({
        state: {...state, run: 3, answered: {key: '2', verdict: 'correct', answerItemId: null}},
      });
    });

    // Then — S7·✓'s register: the count above the band, from three up
    expect(screen.getByText('3 in a row')).toBeTruthy();
    await waitFor(() => {
      expect(cues.played()).toContain('run');
    });

    // When — the run continues
    act(() => {
      useStopSession.setState({
        state: {...state, run: 4, answered: {key: '4', verdict: 'correct', answerItemId: null}},
      });
    });

    // Then — the count follows, and the run cue fired only at three
    expect(screen.getByText('4 in a row')).toBeTruthy();
    await waitFor(() => {
      expect(cues.played().filter(cue => cue === 'run')).toEqual(['run']);
    });
  });

  it('keeps the count off the band below three', async () => {
    // Given
    renderScreen(<Stop />);
    const state = await ready();

    // When
    act(() => {
      useStopSession.setState({
        state: {...state, run: 2, answered: {key: '2', verdict: 'correct', answerItemId: null}},
      });
    });

    // Then
    expect(screen.queryByText(/in a row/)).toBeNull();
  });

  it('chips a warm-up entry, and only the chip is new', async () => {
    // Given — the fixture ships no warm-up positions, so one is hand-marked
    renderScreen(<Stop />);
    const state = await ready();
    const exerciseAt = state.queue.findIndex(
      entry => entry.position.kind === 'exercise' && entry.position.exercise.commitMode === 'tap',
    );
    expect(exerciseAt).toBeGreaterThan(-1);
    const entry = state.queue[exerciseAt];
    if (entry === undefined || entry.position.kind !== 'exercise') {
      throw new Error('no tap exercise in the fixture stop');
    }
    const marked = {
      ...entry,
      position: {...entry.position, exercise: {...entry.position.exercise, warmUp: true as const}},
    };
    const queue = state.queue.map((candidate, i) => (i === exerciseAt ? marked : candidate));

    // When
    jumpTo({...state, queue}, exerciseAt);

    // Then
    expect(screen.getByText('Warm-up')).toBeTruthy();
  });

  it('fires the stop-complete cue once when the moment mounts', async () => {
    // Given
    renderScreen(<Stop />);
    const state = await ready();
    const momentAt = state.queue.findIndex(entry => entry.position.kind === 'moment');
    expect(momentAt).toBeGreaterThan(-1);

    // When
    jumpTo(state, momentAt);

    // Then
    await waitFor(() => {
      expect(cues.played()).toEqual(['stop-complete']);
    });
  });

  it('asks how the glyph sounds and answers in letter names, on the Read stop', async () => {
    // Given — stop.1.1 carries the four corrected see-it-say-it drills
    params.id = 'stop.1.1';
    renderScreen(<Stop />);
    const state = await ready();
    const seeItAt = state.queue.findIndex(
      entry =>
        entry.position.kind === 'exercise' &&
        entry.position.exercise.presentation === 'see-it-say-it',
    );
    expect(seeItAt).toBeGreaterThan(-1);

    // When
    jumpTo(state, seeItAt);

    // Then — the glyph prompt stands and the options are the romanised names
    expect(screen.getByText('How does this sound?')).toBeTruthy();
    expect(screen.getByText('dreng bu')).toBeTruthy();

    // When — the answer is tapped
    fireEvent.click(screen.getByText('dreng bu'));

    // Then — the tap committed and the correct band marked its cue
    await waitFor(() => {
      expect(cues.played()).toContain('correct');
    });
  });

  it('teaches a letter from its card, resolved through the script reference', async () => {
    // Given
    params.id = 'stop.1.1';
    renderScreen(<Stop />);
    const state = await ready();
    const cardAt = state.queue.findIndex(
      entry => entry.position.kind === 'card' && entry.position.card === 'letter',
    );
    expect(cardAt).toBeGreaterThan(-1);

    // When
    jumpTo(state, cardAt);

    // Then — the name appears as both reading and gloss, per `letterDisplayItem`
    expect(screen.getByText('New letter')).toBeTruthy();
    expect(screen.getAllByText('gi gu').length).toBeGreaterThan(0);
  });

  it('keeps the place on x: the P4 dialog, never a straight exit', async () => {
    // Given
    renderScreen(<Stop />);
    await ready();

    // When — the x is pressed
    fireEvent.click(screen.getByLabelText('Leave the stop'));

    // Then — place-kept wording from the board, never loss-framed
    expect(screen.getByText('Leave this stop?')).toBeTruthy();
    expect(
      screen.getByText('Your place is kept — the stop carries on where you left off.'),
    ).toBeTruthy();
    expect(back).not.toHaveBeenCalled();

    // When — the learner keeps going
    fireEvent.click(screen.getByText('Keep going'));

    // Then — the dialog closes and nothing left
    expect(screen.queryByText('Leave this stop?')).toBeNull();
    expect(back).not.toHaveBeenCalled();

    // When — the x again, and Leave this time
    fireEvent.click(screen.getByLabelText('Leave the stop'));
    fireEvent.click(screen.getByText('Leave'));

    // Then
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('carries on from a parked place through the S4·r interstitial', async () => {
    // Given — a first visit steps inside, which parks the place
    const first = renderScreen(<Stop />);
    fireEvent.click(await screen.findByText('Step inside'));
    await screen.findByText('trashi delek');
    await waitFor(() => {
      expect(appStates.current().session).not.toBeNull();
    });

    // When — the screen dies and the stop is entered again
    first.unmount();
    act(() => {
      useStopSession.getState().reset();
    });
    renderScreen(<Stop />);

    // Then — S4·r before the queue, in the board's words
    expect(await screen.findByText('Carrying on where you left off.')).toBeTruthy();
    expect(screen.getByText('Carry on')).toBeTruthy();

    // When — Carry on
    fireEvent.click(screen.getByText('Carry on'));

    // Then — the restored entry, not the intro
    expect(await screen.findByText('trashi delek')).toBeTruthy();
    expect(screen.queryByText('Step inside')).toBeNull();
  });

  it('raises the G4 sheet over the end when the stop holds an artifact', async () => {
    // Given — stop.meeting.c1.5 carries the vocab.tibet card
    params.id = 'stop.meeting.c1.5';
    renderScreen(<Stop />);
    const state = await ready();
    const endAt = state.queue.findIndex(entry => entry.position.kind === 'end');
    expect(endAt).toBeGreaterThan(-1);
    jumpTo(state, endAt);

    // When — Done on the recap
    fireEvent.click(screen.getByText('Done'));

    // Then — the sheet, quiet, with the crane naming the find
    expect(await screen.findByText('You found Tibet.')).toBeTruthy();
    expect(back).not.toHaveBeenCalled();

    // When — See the card
    fireEvent.click(screen.getByText('See the card'));

    // Then — the shelf card's own route, addressed by collection and ordinal
    expect(push).toHaveBeenCalledWith('/card/collection.land/8');

    // When — Keep going
    fireEvent.click(screen.getByText('Keep going'));

    // Then — one stop does not close a circuit: back, not a ceremony
    await waitFor(() => {
      expect(back).toHaveBeenCalledTimes(1);
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it('routes to the district ceremony when its last stop completes', async () => {
    // Given — every other first-circuit stop of the district already walked
    params.id = 'stop.core.c1.6';
    renderScreen(<Stop />);
    const state = await ready();
    act(() => {
      useProgress.getState().apply({
        walkedOn: [],
        items: {},
        completedStops: [
          'stop.core.c1.1',
          'stop.core.c1.2',
          'stop.core.c1.3',
          'stop.core.c1.4',
          'stop.core.c1.5',
        ],
        version: 2,
      });
    });
    const endAt = state.queue.findIndex(entry => entry.position.kind === 'end');
    expect(endAt).toBeGreaterThan(-1);
    jumpTo(state, endAt);

    // When — Done on the recap
    fireEvent.click(screen.getByText('Done'));

    // Then — the circuit closed: replace to S9, never just back
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith({
        pathname: '/ceremony/district',
        params: {slug: 'core', circuit: '1'},
      });
    });
    expect(back).not.toHaveBeenCalled();
  });

  it('plans no audio-gated drill while the build ships no recordings', async () => {
    // Given
    // The default audio source: the deliberate stub, isAvailable false
    renderScreen(<Stop />);

    // When
    const state = await ready();

    // Then
    // Growing the allow-list changed nothing about today's queue
    const gated = ['hear-it-find-it', 'phrase-produce', 'read-it-aloud'];
    const planned = state.queue.filter(
      entry =>
        entry.position.kind === 'exercise' && gated.includes(entry.position.exercise.presentation),
    );
    expect(planned).toHaveLength(0);
  });

  it('renders the Read teaching surfaces of stop.6.1: the rule, the reprise, the stack card', async () => {
    // Given
    params.id = 'stop.6.1';
    renderScreen(<Stop />);
    const state = await ready();

    // When — the rule statement (RS1)
    const ruleAt = state.queue.findIndex(
      entry => entry.position.kind === 'note' && entry.position.note === 'rule-statement',
    );
    expect(ruleAt).toBeGreaterThan(-1);
    jumpTo(state, ruleAt);

    // Then
    expect(screen.getByText('The rule')).toBeTruthy();

    // When — the reprise (RR1)
    const repriseAt = state.queue.findIndex(
      entry => entry.position.kind === 'note' && entry.position.note === 'rule-reprise',
    );
    expect(repriseAt).toBeGreaterThan(-1);
    jumpTo(state, repriseAt);

    // Then
    expect(screen.getByText('You know this one')).toBeTruthy();

    // When — a stack card (SK1), resolved through the exercise prompts
    const stackAt = state.queue.findIndex(
      entry => entry.position.kind === 'card' && entry.position.card === 'stack',
    );
    expect(stackAt).toBeGreaterThan(-1);
    jumpTo(state, stackAt);

    // Then
    expect(screen.getByText('New stack')).toBeTruthy();
  });

  it('closes stop.6.1 on the sort, then the R11 recap', async () => {
    // Given
    params.id = 'stop.6.1';
    renderScreen(<Stop />);
    const state = await ready();

    // When — the sort-what-changed entry
    const sortAt = state.queue.findIndex(
      entry =>
        entry.position.kind === 'exercise' &&
        entry.position.exercise.presentation === 'sort-what-changed',
    );
    expect(sortAt).toBeGreaterThan(-1);
    jumpTo(state, sortAt);

    // Then — the stop question over toggleable pairs, committing on Check
    expect(screen.getByText(/Which of these did the/)).toBeTruthy();
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
    expect(screen.getByText('Check')).toBeTruthy();

    // When — the end
    const endAt = state.queue.findIndex(entry => entry.position.kind === 'end');
    expect(endAt).toBeGreaterThan(-1);
    jumpTo(state, endAt);

    // Then — the recap table, one row per pair, before the capabilities
    expect(screen.getByText('All of them, together')).toBeTruthy();
    expect(screen.getByText('Stop complete')).toBeTruthy();
  });

  it('rides the cue-ladder rung on the band when a find-the-root commits', async () => {
    // Given — stop.7.2 carries the six one-letter find-the-root drills
    params.id = 'stop.7.2';
    renderScreen(<Stop />);
    const state = await ready();
    const rootAt = state.queue.findIndex(
      entry =>
        entry.position.kind === 'exercise' &&
        entry.position.exercise.presentation === 'find-the-root',
    );
    expect(rootAt).toBeGreaterThan(-1);
    jumpTo(state, rootAt);
    expect(screen.getByText('Which letter is the root?')).toBeTruthy();

    // When — the subjoined part is tapped, which is the wrong position
    fireEvent.click(screen.getByText('◌ྲ'));

    // Then — the band's headline is the rung, not the syllable, and the
    // dimmed redraw carries its text caption
    expect(await screen.findByText(/single letter on the line/)).toBeTruthy();
    expect(screen.getAllByText(/root/).length).toBeGreaterThan(0);
  });

  it('shows the first readable word once, when the stop end crosses zero readable', async () => {
    // Given
    params.id = 'stop.1.1';
    override('content', new JsonContentSource(crossingFixture()));
    renderScreen(<Stop />);
    const state = await ready();
    act(() => {
      useProgress.getState().apply(crossedLetters());
    });
    const endAt = state.queue.findIndex(entry => entry.position.kind === 'end');
    expect(endAt).toBeGreaterThan(-1);
    jumpTo(state, endAt);

    // When
    fireEvent.click(screen.getByText('Done'));

    // Then
    expect(await screen.findByText('You already say this one.')).toBeTruthy();
    expect(screen.getByText('Now you can read it.')).toBeTruthy();
    expect(await screen.findByText('uncle', undefined, {timeout: 3000})).toBeTruthy();
    expect(screen.getByText('Read it again')).toBeTruthy();
    expect(back).not.toHaveBeenCalled();

    // When
    fireEvent.click(screen.getByText('Keep going'));

    // Then
    await waitFor(() => {
      expect(back).toHaveBeenCalledTimes(1);
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it('keeps the moment off a later stop, once a word is already readable', async () => {
    // Given
    params.id = 'stop.6.1';
    override('content', new JsonContentSource(crossingFixture()));
    const seeded = memoryStore();
    await seeded.save({...crossedLetters(), completedStops: ['stop.1.1']});
    override('progress', seeded);
    renderScreen(<Stop />);
    const state = await ready();
    const endAt = state.queue.findIndex(entry => entry.position.kind === 'end');
    expect(endAt).toBeGreaterThan(-1);
    jumpTo(state, endAt);

    // When
    fireEvent.click(screen.getByText('Done'));

    // Then
    await waitFor(() => {
      expect(back).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText('You already say this one.')).toBeNull();
    expect(screen.queryByText('You can read this one.')).toBeNull();
  });

  it('renders a phrase-produce entry as E5: English prompt, record, skip', async () => {
    // Given
    // The fixture plans none today, so one is hand-marked, as the warm-up
    // test does; the day takes land this arrives from the planner
    renderScreen(<Stop />);
    const state = await ready();
    const exerciseAt = state.queue.findIndex(entry => entry.position.kind === 'exercise');
    expect(exerciseAt).toBeGreaterThan(-1);
    const entry = state.queue[exerciseAt];
    if (entry === undefined || entry.position.kind !== 'exercise') {
      throw new Error('no exercise in the fixture stop');
    }
    const produce = {
      ...entry,
      position: {
        kind: 'exercise' as const,
        exercise: {
          ...entry.position.exercise,
          exerciseType: 'phrase-produce',
          presentation: 'phrase-produce',
          commitMode: 'none' as const,
          options: [],
        },
      },
      options: undefined,
    };
    const queue = state.queue.map((candidate, i) => (i === exerciseAt ? produce : candidate));

    // When
    jumpTo({...state, queue}, exerciseAt);

    // Then
    // The before state: English only, one record button, a free skip
    expect(screen.getByText('Say')).toBeTruthy();
    expect(screen.getByLabelText('Record yourself')).toBeTruthy();
    expect(screen.getByText('Say it, then hear how she says it.')).toBeTruthy();

    // When
    fireEvent.click(screen.getByText('Skip this one'));

    // Then
    // A plain continue: the queue advances with no verdict recorded
    await waitFor(() => {
      expect(useStopSession.getState().state?.index).toBe(exerciseAt + 1);
    });
    expect(useStopSession.getState().state?.answered).toBeNull();
  });
});
