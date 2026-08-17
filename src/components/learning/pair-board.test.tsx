/**
 * @fileoverview PairBoard's contract — no control nested inside another.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {PairBoard} from './pair-board';

describe('PairBoard', () => {
  it('keeps the tile and its play control as separate targets', () => {
    // A button inside a button: React rejects it on web outright, and on a device the
    // tile's press competes with the control the learner is reaching for.

    // Given
    const left = [{bo: 'སྤོས་', roman: 'pö'}];
    const right = [{en: 'incense'}];

    // When
    const {container} = render(<PairBoard left={left} right={right} onPick={() => {}} />);

    // Then
    for (const button of container.querySelectorAll('[role="button"]')) {
      expect(button.querySelector('[role="button"]')).toBeNull();
    }
  });
});
