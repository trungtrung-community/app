/**
 * @fileoverview AnswerBand's contract — the rules `docs/03` states about the band that
 * closes an exercise, which a screenshot review passes over unnoticed.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {AnswerBand} from './answer-band';

describe('AnswerBand', () => {
  it('carries no reason when the rule is not the lesson', () => {
    // Amended 2026-08-16: a band without a reason is correct, not degraded. On a
    // recognition drill a sentence about a rule the screen never showed is pollution.

    // When
    render(
      <AnswerBand tone="correct" roman="trashi delek" pinned={false}>
        བཀྲ་ཤིས་བདེ་ལེགས
      </AnswerBand>,
    );

    // Then
    expect(screen.getByText('trashi delek')).toBeTruthy();
    expect(screen.queryByText(/under a letter/)).toBeNull();
  });

  it('shows the rule where the rule is the lesson', () => {
    // When
    render(
      <AnswerBand tone="wrong" reason="ར་ under a letter makes it a stack." pinned={false}>
        ཀྲ
      </AnswerBand>,
    );

    // Then
    expect(screen.getByText(/makes it a stack/)).toBeTruthy();
  });

  it('names the action differently per tone, because a miss is not a win', () => {
    // When
    const {unmount} = render(
      <AnswerBand tone="correct" pinned={false}>
        ཀ
      </AnswerBand>,
    );

    // Then
    expect(screen.getByText('Next')).toBeTruthy();

    // When
    unmount();
    render(
      <AnswerBand tone="wrong" pinned={false}>
        ཀ
      </AnswerBand>,
    );

    // Then
    expect(screen.getByText('Continue')).toBeTruthy();
  });

  it('carries one count and no second', () => {
    // When
    render(
      <AnswerBand tone="correct" mark="4 in a row" pinned={false}>
        ཀ
      </AnswerBand>,
    );

    // Then
    expect(screen.getAllByText('4 in a row')).toHaveLength(1);
  });
});
