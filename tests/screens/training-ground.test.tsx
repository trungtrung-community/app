/**
 * @fileoverview Q6/Q7 — the training ground's loop and the metronome's five
 * signed conditions (docs/03 §4.3; docs/07 2026-08-07). Renders the real route
 * screen against the real fixture through the container. Phases per docs/11.
 *
 * The counts asserted here are measured from the committed fixture, never
 * typed from the spec: completing `stop.6.1` (Read section 6) yields 30
 * consonants (section 2), 81 stacks (48 at section 3 + 33 at section 6), 132
 * stack-grid syllables (section 6) and 335 Read words (sections 2–6). The
 * fixture carries no `grid`, `demo`, `ending-grid`, `worked` or `corpus`
 * syllables, so those piles are honestly absent.
 */

import {act, fireEvent, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import TrainingGround from '../../app/training-ground';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {Progress} from '../../src/ports/progress-store';

import {useProgress} from '../../src/store/progress';

const {back, push, replace} = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({back, push, replace}),
}));

const play = vi.hoisted(() => ({
  playClip: vi.fn(),
  stopClip: vi.fn(),
}));
vi.mock('../../src/composition/play', () => play);

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** One Read section-6 stop done — the ceiling the measured counts assume. */
const SECTION_6: Progress = {...EMPTY, completedStops: ['stop.6.1']};

/** The default beat: the board's 72 to the minute, rounded up to whole ms. */
const BEAT_MS = Math.ceil(60_000 / 72);

const saveSpy = vi.fn(async () => {});

/** The card's front, waited for after every async draw. */
function frontPrompt() {
  return screen.findByText('Say it aloud, then turn it.');
}

/** The glyph currently on the card, read while the card shows its front. */
function cardFace(): string {
  const face = screen.getByTestId('training-card').textContent ?? '';
  return face.replace('Say it aloud, then turn it.', '');
}

/** One pass of the loop: turn the card, then mark it. */
function turnAndMark(label: 'Not yet' | 'Got it') {
  fireEvent.click(screen.getByRole('button', {name: 'Turn it over'}));
  fireEvent.click(screen.getByRole('button', {name: label}));
}

describe('the training ground', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    override('progress', {
      load: async () => EMPTY,
      save: saveSpy,
      export: async () => '',
      clear: async () => {},
    });
    useProgress.setState({progress: SECTION_6});
    back.mockClear();
    push.mockClear();
    replace.mockClear();
    play.playClip.mockClear();
    saveSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('binds every pile count to its source at the learner’s section', async () => {
    // When
    renderScreen(<TrainingGround />);

    // Then
    // Measured from the fixture at ceiling 6 — see the fileoverview.
    expect(await screen.findByText('The thirty · 30')).toBeTruthy();
    expect(screen.getByText('Stacks · 81')).toBeTruthy();
    expect(screen.getByText('Stacks × vowel · 132')).toBeTruthy();
    expect(screen.getByText('Whole words · 335')).toBeTruthy();
    expect(screen.queryByText(/Letter × vowel/)).toBeNull();
  });

  it('opens nothing before the stop that teaches it', async () => {
    // Given — section 1 teaches only the vowels; the thirty arrive at section 2
    useProgress.setState({progress: {...EMPTY, completedStops: ['stop.1.1']}});

    // When
    renderScreen(<TrainingGround />);

    // Then
    expect(await screen.findByText('The training ground opens as you walk')).toBeTruthy();
    expect(screen.queryByText(/The thirty/)).toBeNull();
  });

  it('reveals the reading and plays the recording on the turn', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Turn it over'}));

    // Then
    expect(screen.getByTestId('training-reading').textContent).not.toBe('');
    expect(play.playClip).toHaveBeenCalledTimes(1);
    expect(play.playClip).toHaveBeenCalledWith(
      expect.objectContaining({path: expect.stringContaining('audio/letters/')}),
    );
  });

  it('not yet returns the card to the pile — it comes round again', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();
    const first = cardFace();

    // When
    // The thirty is 30 cards; 30 not-yets walk the whole rotation.
    for (let i = 0; i < 30; i += 1) {
      turnAndMark('Not yet');
    }

    // Then
    expect(cardFace()).toBe(first);
  });

  it('never empties the pile by itself under not yet', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();

    // When
    for (let i = 0; i < 30; i += 1) {
      turnAndMark('Not yet');
    }

    // Then
    expect(screen.getByText('Say it aloud, then turn it.')).toBeTruthy();
    expect(screen.queryByText('You put the last card down')).toBeNull();
  });

  it('got it puts the card down and moves on', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();
    const first = cardFace();

    // When
    turnAndMark('Got it');

    // Then
    expect(cardFace()).not.toBe(first);
  });

  it('ends a pile only by the learner’s own hand, and counts nothing', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();

    // When
    for (let i = 0; i < 30; i += 1) {
      turnAndMark('Got it');
    }

    // Then
    expect(screen.getByText('You put the last card down')).toBeTruthy();
    expect(screen.queryByText(/personal best|streak|score|run length/i)).toBeNull();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('writes no progress — §4.3 says nothing about the scheduler', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();

    // When
    turnAndMark('Got it');
    fireEvent.click(screen.getByRole('button', {name: 'Turn it over'}));
    fireEvent.click(screen.getByRole('button', {name: 'Not yet'}));

    // Then
    expect(saveSpy).not.toHaveBeenCalled();
    expect(useProgress.getState().progress).toEqual(SECTION_6);
  });

  it('leaves immediately — no dialog, nothing saved', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();

    // When
    fireEvent.click(screen.getByLabelText('Back'));

    // Then
    expect(back).toHaveBeenCalledTimes(1);
    expect(saveSpy).not.toHaveBeenCalled();
  });
});

describe('the metronome — the five signed conditions of docs/07 (2026-08-07)', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    override('progress', {
      load: async () => EMPTY,
      save: saveSpy,
      export: async () => '',
      clear: async () => {},
    });
    useProgress.setState({progress: SECTION_6});
    play.playClip.mockClear();
    saveSpy.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Fake only the metronome's own timers. Faking requestAnimationFrame would
  // replace the guarded frame scheduler vitest.setup.ts installs, and a
  // torn-down Reanimated mapper firing inside advanceTimersByTime would then
  // escape the guard and fail the run after every assertion has passed.
  const metronomeTimers = () =>
    vi.useFakeTimers({toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval']});

  it('1 — is off by default, and nothing advances while it is off', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();
    const first = cardFace();

    // When
    metronomeTimers();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    // Then
    expect(screen.getByRole('switch', {name: 'Metronome'}).getAttribute('aria-checked')).toBe(
      'false',
    );
    expect(cardFace()).toBe(first);
  });

  it('3 — at the set tempo the pile advances to the next card automatically', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();
    // Fake timers first, so the beat's interval registers against the fake clock.
    metronomeTimers();
    fireEvent.click(screen.getByRole('switch', {name: 'Metronome'}));
    const first = cardFace();

    // When
    act(() => {
      vi.advanceTimersByTime(BEAT_MS);
    });

    // Then
    expect(cardFace()).not.toBe(first);
  });

  it('2 — the learner sets the tempo, and can change it mid-drill', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();
    metronomeTimers();
    fireEvent.click(screen.getByRole('switch', {name: 'Metronome'}));
    expect(screen.getByText('72 to the minute — change it any time')).toBeTruthy();

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Faster'}));

    // Then
    expect(screen.getByText('76 to the minute — change it any time')).toBeTruthy();
    const first = cardFace();
    act(() => {
      vi.advanceTimersByTime(Math.ceil(60_000 / 76));
    });
    expect(cardFace()).not.toBe(first);
  });

  it('4 — nothing is scored, compared, or lost by stopping', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();
    metronomeTimers();
    fireEvent.click(screen.getByRole('switch', {name: 'Metronome'}));
    act(() => {
      vi.advanceTimersByTime(BEAT_MS);
    });

    // When
    fireEvent.click(screen.getByRole('switch', {name: 'Metronome'}));
    const kept = cardFace();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    // Then
    expect(screen.getByText('Off — a beat to play against, never a clock')).toBeTruthy();
    expect(cardFace()).toBe(kept);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/personal best|streak|score|accuracy/i)).toBeNull();
  });

  it('5 — a pacing instrument, never a timer: falling behind has no consequence', async () => {
    // Given
    renderScreen(<TrainingGround />);
    await frontPrompt();
    metronomeTimers();
    fireEvent.click(screen.getByRole('switch', {name: 'Metronome'}));
    const first = cardFace();

    // When
    // 30 beats with nothing marked: the whole pile passes by, untouched.
    for (let i = 0; i < 30; i += 1) {
      act(() => {
        vi.advanceTimersByTime(BEAT_MS);
      });
    }

    // Then
    // The rotation came full circle — every card is still in the pile.
    expect(cardFace()).toBe(first);
    expect(screen.queryByText(/missed|too slow|fell behind|time's up/i)).toBeNull();
    expect(saveSpy).not.toHaveBeenCalled();
  });
});
