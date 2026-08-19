/**
 * @fileoverview FirstWordMoment's contract: the letters land one at a time and
 * resolve into the word, the replay restarts the resolve, Reduce Motion gets
 * the whole frame at rest, and the two B1 sentences bind to `said`.
 *
 * The landing is sequenced in JS state, so its beats are provable with fake
 * timers as mounted-or-not — never as animation styles, which jsdom does not
 * run. `useReducedMotion` is doubled at the module seam because
 * `vitest.setup.ts` pins `matchMedia` for every other component's sake.
 * Phases per docs/11.
 */

import {act, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {FirstWordMoment} from './first-word-moment';
import {duration} from '../core/motion';

const motion = vi.hoisted(() => ({reduced: false}));
vi.mock('react-native-reanimated', async importOriginal => {
  const actual = await importOriginal<typeof import('react-native-reanimated')>();
  return {...actual, useReducedMotion: () => motion.reduced};
});

/** One landing beat, as the component paces it. */
const BEAT = duration.slow;

function beat(times = 1): void {
  act(() => {
    vi.advanceTimersByTime(times * BEAT);
  });
}

describe('FirstWordMoment', () => {
  beforeEach(() => {
    motion.reduced = false;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lands the letters one at a time, then resolves the word', () => {
    // Given
    render(<FirstWordMoment bo="ཨ་ཁུ" reading="a khu" gloss="uncle" said onKeepGoing={() => {}} />);

    // Then
    expect(screen.queryByText('ཨ')).toBeNull();
    expect(screen.queryByText('uncle')).toBeNull();

    // When
    beat();

    // Then
    expect(screen.getByText('ཨ')).toBeTruthy();
    expect(screen.queryByText('ཁ')).toBeNull();

    // When
    beat();

    // Then
    expect(screen.getByText('ཁ')).toBeTruthy();
    expect(screen.queryByText('uncle')).toBeNull();

    // When
    beat();

    // Then
    expect(screen.getByText('uncle')).toBeTruthy();
    expect(screen.getByText('a khu')).toBeTruthy();
  });

  it('replays the resolve from the first letter on Read it again', () => {
    // Given
    render(<FirstWordMoment bo="ཨ་ཁུ" reading="a khu" gloss="uncle" said onKeepGoing={() => {}} />);
    beat(3);
    expect(screen.getByText('uncle')).toBeTruthy();

    // When
    fireEvent.click(screen.getByText('Read it again'));

    // Then
    expect(screen.queryByText('uncle')).toBeNull();
    expect(screen.queryByText('ཨ')).toBeNull();

    // When
    beat(3);

    // Then
    expect(screen.getByText('uncle')).toBeTruthy();
  });

  it('renders the whole frame at rest under Reduce Motion', () => {
    // Given
    motion.reduced = true;

    // When
    render(<FirstWordMoment bo="ཨ་ཁུ" reading="a khu" gloss="uncle" said onKeepGoing={() => {}} />);

    // Then
    expect(screen.getByText('ཨ')).toBeTruthy();
    expect(screen.getByText('ཁ')).toBeTruthy();
    expect(screen.getByText('uncle')).toBeTruthy();
  });

  it('says the crossing sentence for a word the learner already says', () => {
    // When
    render(<FirstWordMoment bo="ཨ་ཁུ" gloss="uncle" said onKeepGoing={() => {}} />);

    // Then
    expect(screen.getByText('You already say this one.')).toBeTruthy();
    expect(screen.getByText('Now you can read it.')).toBeTruthy();
  });

  it('says the honest sentence, with where the word waits, for one never taught', () => {
    // Given
    motion.reduced = true;

    // When
    render(
      <FirstWordMoment
        bo="ལམ"
        gloss="road"
        said={false}
        waitsAt="The Pilgrimage Road"
        onKeepGoing={() => {}}
      />,
    );

    // Then
    expect(screen.getByText('You can read this one.')).toBeTruthy();
    expect(screen.getByText('You were never taught it.')).toBeTruthy();
    expect(
      screen.getByText('It waits at The Pilgrimage Road. The letters got you there first.'),
    ).toBeTruthy();
  });

  it('keeps the waiting line off when no place can be named', () => {
    // Given
    motion.reduced = true;

    // When
    render(<FirstWordMoment bo="ལམ" gloss="road" said={false} onKeepGoing={() => {}} />);

    // Then
    expect(screen.queryByText(/It waits at/)).toBeNull();
  });

  it('hands the stop back on Keep going', () => {
    // Given
    const onKeepGoing = vi.fn();
    render(<FirstWordMoment bo="ཨ་ཁུ" gloss="uncle" said onKeepGoing={onKeepGoing} />);

    // When
    fireEvent.click(screen.getByText('Keep going'));

    // Then
    expect(onKeepGoing).toHaveBeenCalledTimes(1);
  });
});
