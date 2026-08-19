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
});
