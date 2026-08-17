/**
 * @fileoverview SyllableChip's contract — a chip only claims a state it can be in.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {SyllableChip} from './syllable-chip';

describe('SyllableChip', () => {
  it('announces selection only when it can be selected', () => {
    // ChipTray borrows the selected tone for a chunk the app slid into place on reveal.
    // Announcing "selected" there describes a choice the learner never made.

    // When
    const {unmount} = render(<SyllableChip glyph="ཀྲ" roman="tra" tone="selected" />);

    // Then
    expect(screen.getByRole('button').getAttribute('aria-selected')).toBeNull();

    // When
    unmount();
    render(<SyllableChip glyph="ཀྲ" roman="tra" tone="selected" onPress={() => {}} />);

    // Then
    expect(screen.getByRole('button').getAttribute('aria-selected')).toBe('true');
  });
});
