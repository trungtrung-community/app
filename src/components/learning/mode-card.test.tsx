/**
 * @fileoverview ModeCard's contract — how a mode that cannot run says so.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {ModeCard} from './mode-card';

describe('ModeCard', () => {
  it('says why a mode cannot run instead of greying out silently', () => {
    // When
    render(
      <ModeCard
        title="Match the picture"
        body="For the words that have one."
        disabled
        reason="Needs four pictures. This district has two."
      />,
    );

    // Then
    expect(screen.getByText('Needs four pictures. This district has two.')).toBeTruthy();
  });

  it('replaces the card entirely for a mode the learner switched off', () => {
    // Never show someone a shut thing they chose to shut: there is no card to disable.

    // When
    render(<ModeCard absentBecause="Just listen is off while exercises without sound is on." />);

    // Then
    expect(screen.getByText(/Just listen is off/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
