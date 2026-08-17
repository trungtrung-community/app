/**
 * @fileoverview SegmentedControl's contract, and the aria-state trap it shipped with.
 *
 * The trap is written up once in `docs/11-testing-conventions.md` under "the state that
 * never reaches the DOM".
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {SegmentedControl} from './segmented-control';

describe('SegmentedControl', () => {
  it('says which segment is chosen', () => {
    // Given
    const items = [{label: 'Stops'}, {label: 'Words', count: '19'}];

    // When
    render(<SegmentedControl active={0} items={items} onChange={() => {}} />);

    // Then
    const chosen = screen
      .getAllByRole('tab')
      .filter(option => option.getAttribute('aria-selected') === 'true');
    expect(chosen).toHaveLength(1);
  });
});
