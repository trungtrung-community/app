/**
 * @fileoverview SyllableChip's contract — a chip only claims a state it can be in.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {SyllableChip} from './syllable-chip';

describe('SyllableChip', () => {
  it('renders the glyph through TibetanText, which marks the language on the run', () => {
    // The 2026-08-16 audit found the design system's own chip outside the rule, on 236
    // glyphs. The language mark is TibetanText's signature — a plain `Text` never carries
    // it, so a regression that hands the glyph to one fails here. The adherence scanner
    // cannot catch that shape: the glyph travels in a variable, and a line walker only
    // sees literals.

    // When
    const {container} = render(<SyllableChip glyph="ཀྲ" roman="tra" />);

    // Then
    expect(container.querySelector('[lang="bo"]')?.textContent).toBe('ཀྲ');
  });

  it('appends no tsheg, because a letter has no syllable to close', () => {
    // When
    const {container} = render(<SyllableChip glyph="ཀྲ" roman="tra" />);

    // Then
    expect(container.textContent).not.toContain('་');
  });

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
