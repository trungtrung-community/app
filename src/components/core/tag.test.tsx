/**
 * @fileoverview Tag's contract, and the aria-state trap it shipped with.
 *
 * The trap is written up once in `docs/11-testing-conventions.md` under "the state that
 * never reaches the DOM".
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {Tag} from './tag';

describe('Tag', () => {
  it('says it is selected', () => {
    // When
    render(
      <Tag selected onPress={() => {}}>
        Offerings
      </Tag>,
    );

    // Then
    expect(screen.getByRole('button').getAttribute('aria-selected')).toBe('true');
  });
});
