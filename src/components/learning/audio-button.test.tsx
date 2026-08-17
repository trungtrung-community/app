/**
 * @fileoverview AudioButton's contract — the badge prints the rate the player plays.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {SLOW_RATE_LABEL} from '../../domain/audio';
import {AudioButton} from './audio-button';

describe('AudioButton', () => {
  it('takes the slow rate from the domain rather than from a drawn glyph', () => {
    // Ported from the board as a literal "half speed" badge, which the playback module
    // explicitly rejects: it smears vowels enough to change what a learner hears.

    // When
    render(<AudioButton speed="slow" />);

    // Then
    expect(screen.getByText(SLOW_RATE_LABEL)).toBeTruthy();
    expect(screen.queryByText('½×')).toBeNull();
  });
});
