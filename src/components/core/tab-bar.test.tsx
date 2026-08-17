/**
 * @fileoverview TabBar's contract, and the aria-state trap it shipped with.
 *
 * The trap is written up once in `docs/11-testing-conventions.md` under "the state that
 * never reaches the DOM" — four components defend it and the reason belongs in one place.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {TabBar} from './tab-bar';

describe('TabBar', () => {
  it('says which tab is current', () => {
    // Given
    const active = 'journey';

    // When
    render(<TabBar active={active} onSelect={() => {}} />);

    // Then
    const selected = screen
      .getAllByRole('tab')
      .filter(tab => tab.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
  });
});
