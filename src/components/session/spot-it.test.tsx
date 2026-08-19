/**
 * @fileoverview SpotIt's contract — the written question asks for a function,
 * four glyph tiles answer, a tap commits (RB18). Phases per docs/11.
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {Items, SessionEntry} from './types';
import {SpotIt} from './spot-it';

const QUESTION = 'Which mark separates one syllable from the next?';

const ENTRY: SessionEntry = {
  key: '0',
  ask: 'first',
  position: {
    kind: 'exercise',
    exercise: {
      exerciseId: 'ex.10.1.001',
      itemId: null,
      exerciseType: 'spot-it',
      presentation: 'spot-it',
      commitMode: 'tap',
      question: QUESTION,
      options: [
        {itemId: 'mark.tsheg', isAnswer: true, label: '་'},
        {itemId: 'mark.shad', isAnswer: false, label: '།'},
        {itemId: 'mark.nyis-shad', isAnswer: false, label: '༎'},
        {itemId: 'mark.ter-tsheg', isAnswer: false, label: '༔'},
      ],
    },
  },
};

const NO_ITEMS: Items = new Map();

describe('SpotIt', () => {
  it('asks the function in writing and offers four glyph tiles', () => {
    // When
    render(<SpotIt entry={ENTRY} answered={null} itemsById={NO_ITEMS} onCommit={() => {}} />);

    // Then
    expect(screen.getByText(QUESTION)).toBeTruthy();
    // The tile may carry a break opportunity beside the mark, so match loosely
    expect(screen.getByText(/་/)).toBeTruthy();
    expect(screen.getByText(/།/)).toBeTruthy();
    expect(screen.getByText(/༎/)).toBeTruthy();
    expect(screen.getByText(/༔/)).toBeTruthy();
  });

  it('commits on the tap itself', () => {
    // Given
    const onCommit = vi.fn();
    render(<SpotIt entry={ENTRY} answered={null} itemsById={NO_ITEMS} onCommit={onCommit} />);

    // When
    fireEvent.click(screen.getByText(/་/));

    // Then
    expect(onCommit).toHaveBeenCalledWith({kind: 'tap', itemId: 'mark.tsheg'});
  });

  it('takes no second tap once the band is up', () => {
    // Given
    const onCommit = vi.fn();
    render(
      <SpotIt
        entry={ENTRY}
        answered={{key: '0', verdict: 'correct', answerItemId: 'mark.tsheg'}}
        itemsById={NO_ITEMS}
        onCommit={onCommit}
      />,
    );

    // When
    fireEvent.click(screen.getByText(/།/));

    // Then
    expect(onCommit).not.toHaveBeenCalled();
  });
});
