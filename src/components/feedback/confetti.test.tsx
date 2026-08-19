/**
 * @fileoverview Confetti's contract: it is decoration, and it never gets in the way.
 *
 * What is deliberately not asserted here is how it looks. jsdom runs no animation and does
 * no layout, so a test about where a piece is at 600ms would be measuring the mock. The
 * two things worth defending are the ones a screenshot would never show and a learner
 * would immediately feel: assistive technology must not announce a shower of empty views,
 * and a burst covering the whole frame must not swallow the tap on whatever is underneath
 * it. Both are properties of the tree, and both are checkable here.
 *
 * The reduce-motion path is not covered for the same reason it exists: Reanimated reads the
 * setting from the device, and `vitest.setup.ts` pins `matchMedia` to `matches: false` so
 * that every other component's animation loads at all. Turning it on is step 6 of the
 * device pass in the plan.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {Confetti} from './confetti';

describe('Confetti', () => {
  it('throws the number of pieces it was asked for', () => {
    // When
    render(<Confetti count={12} testID="burst" />);

    // Then
    expect(screen.getByTestId('burst').childNodes).toHaveLength(12);
  });

  it('never takes a touch from what it is celebrating', () => {
    // A burst fills the frame. If it accepted touches, the button underneath it would be
    // dead for the two seconds a learner is most likely to press it.

    // When
    render(<Confetti count={4} testID="burst" />);

    // Then
    expect(screen.getByTestId('burst').style.pointerEvents).toBe('none');
  });

  it('is decoration, so a screen reader is told nothing about it', () => {
    // When
    render(<Confetti count={4} testID="burst" />);

    // Then
    expect(screen.getByTestId('burst').getAttribute('aria-hidden')).toBe('true');
  });
});
