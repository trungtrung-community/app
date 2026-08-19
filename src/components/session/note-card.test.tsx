/**
 * @fileoverview NoteCard's contract — the four note registers render
 * distinctly: the rule surfaces carry their eyebrows, the reprise says the
 * learner owns it, and a tip stays a quiet paragraph. Phases per docs/11.
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {NoteCard} from './note-card';

describe('NoteCard', () => {
  it('speaks a rule statement under The rule eyebrow', () => {
    // When
    render(
      <NoteCard note="rule-statement" text="A superscript is silent." onContinue={() => {}} />,
    );

    // Then
    expect(screen.getByText('The rule')).toBeTruthy();
    expect(screen.getByText('A superscript is silent.')).toBeTruthy();
  });

  it('frames a rule card as the keepsake, same eyebrow', () => {
    // When
    render(<NoteCard note="rule-card" text="Four written marks." onContinue={() => {}} />);

    // Then
    expect(screen.getByText('The rule')).toBeTruthy();
    expect(screen.getByText('Four written marks.')).toBeTruthy();
  });

  it('marks a reprise as something the learner already owns', () => {
    // When
    render(
      <NoteCard note="rule-reprise" text="A prefix takes the breath out." onContinue={() => {}} />,
    );

    // Then
    expect(screen.getByText('You know this one')).toBeTruthy();
    expect(screen.getByText('A prefix takes the breath out.')).toBeTruthy();
  });

  it('keeps a tip quiet: the paragraph and a Continue, nothing else', () => {
    // Given
    const onContinue = vi.fn();
    render(<NoteCard note="tip" text="Three of the four sit above." onContinue={onContinue} />);

    // Then
    expect(screen.queryByText('The rule')).toBeNull();
    expect(screen.queryByText('You know this one')).toBeNull();

    // When
    fireEvent.click(screen.getByText('Continue'));

    // Then
    expect(onContinue).toHaveBeenCalled();
  });
});
