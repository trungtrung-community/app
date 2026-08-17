/**
 * @fileoverview WordRow's contract — what the row says about a word it cannot fully offer.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {WordRow, NOT_FOUND_YET} from './word-row';

describe('WordRow', () => {
  it('states the gap in words and offers nothing to play', () => {
    // When
    render(<WordRow en="prayer wheel" noScript="Recorded in Amdo, not yet in Lhasa." />);

    // Then
    expect(screen.getByText(NOT_FOUND_YET)).toBeTruthy();
    expect(screen.getByText('prayer wheel')).toBeTruthy();
    expect(screen.queryByLabelText(/Play/)).toBeNull();
  });

  it('turns audio off for a word not yet reachable', () => {
    // When
    const {unmount} = render(<WordRow bo="ཐུགས་" roman="thuk" en="mind" status="known" />);

    // Then
    expect(screen.getAllByLabelText(/Play/).length).toBeGreaterThan(0);

    // When
    unmount();
    render(<WordRow bo="ཐུགས་" roman="thuk" en="mind" status="coming" />);

    // Then
    expect(screen.queryByLabelText(/Play/)).toBeNull();
  });

  it('shows the register marker only when the word is honorific', () => {
    // When
    const {unmount} = render(<WordRow bo="ཐུགས་" roman="thuk" en="mind" register="honorific" />);

    // Then
    expect(screen.getByText('honorific')).toBeTruthy();

    // When
    unmount();
    render(<WordRow bo="ཆུ་ཚོད་" roman="chutsö" en="hour" register={null} />);

    // Then
    expect(screen.queryByText('honorific')).toBeNull();
  });

  it('adds the reduced-rate control only when asked, and beside the natural one', () => {
    // When
    render(<WordRow bo="ཐུགས་" roman="thuk" en="mind" slow />);

    // Then — one clip, two rates, not two recordings.
    expect(screen.getAllByLabelText(/Play/)).toHaveLength(2);
  });
});
