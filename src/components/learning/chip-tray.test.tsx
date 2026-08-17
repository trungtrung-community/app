/**
 * @fileoverview ChipTray's contract — what the tray counts, and what it declines to mark.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {ChipTray} from './chip-tray';

describe('ChipTray', () => {
  it('takes slots as the authority, not the chip count', () => {
    // The tray may hold chips that belong nowhere, so it is free to be longer than the
    // answer row has places.

    // Given
    const answer = [{glyph: 'ཡང་བསྐྱར་', roman: 'yangkyar'}];
    const tray = [
      {glyph: 'ཞུ་', roman: 'zhu'},
      {glyph: 'གསུངས་', roman: 'sung'},
      {glyph: 'སྙིང་', roman: 'nying'},
    ];

    // When
    render(<ChipTray answer={answer} tray={tray} slots={4} />);

    // Then
    expect(screen.getByText('In the order you heard')).toBeTruthy();
    expect(screen.getByText('Still in the tray')).toBeTruthy();
  });

  it('leaves a decoy in the tray unmarked, because leaving it there was right', () => {
    // Given
    const answer = [{glyph: 'ཡང་བསྐྱར་', roman: 'yangkyar'}];
    const tray = [{glyph: 'ཞུ་', roman: 'zhu'}];

    // When
    render(<ChipTray answer={answer} tray={tray} slots={1} onPick={() => {}} />);

    // Then
    const decoy = screen.getByLabelText('zhu');
    expect(decoy.getAttribute('aria-selected')).toBe('false');
  });
});
