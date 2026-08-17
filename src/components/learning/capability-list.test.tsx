/**
 * @fileoverview CapabilityList's contract — information about reach, never a grade.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {CapabilityList, type Capability} from './capability-list';

describe('CapabilityList', () => {
  it('draws a hollow ring rather than a red mark for what is not reached yet', () => {
    // Information, never a grade — which is why it is the same component and only the
    // marker changes.

    // Given
    const items = [{capability: 'Ask how much something costs'}];

    // When
    render(<CapabilityList marker="ring" items={items} />);

    // Then
    expect(screen.getByText('Ask how much something costs')).toBeTruthy();
  });

  it('lets one item override the list default', () => {
    // Given — annotated because `marker` widens to `string` once the array leaves the
    // JSX attribute that was contextually typing it.
    const items: Capability[] = [
      {capability: 'Count to ten'},
      {capability: 'Count past twenty', marker: 'ring'},
    ];

    // When
    const {container} = render(<CapabilityList items={items} />);

    // Then — one check icon for the two items: the second is hollow.
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });
});
