/**
 * @fileoverview ReadAWord's contract — a word in uchen, four English options,
 * a tap commits, and nothing plays: silent by design (B2). Phases per docs/11.
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {ContentItemId} from '../../ports/content-ids';
import type {Items, SessionEntry} from './types';
import {ReadAWord} from './read-a-word';

const ITEMS: Items = new Map([
  [
    'vocab.apple' as ContentItemId,
    {
      id: 'vocab.apple' as ContentItemId,
      kind: 'vocab',
      bo: 'ཀུ་ཤུ',
      roman: 'kushu',
      en: 'apple',
    },
  ],
]);

const ENTRY: SessionEntry = {
  key: '0',
  ask: 'first',
  position: {
    kind: 'exercise',
    exercise: {
      exerciseId: 'ex.10.2.001',
      itemId: 'word.kushu',
      exerciseType: 'read-a-word',
      presentation: 'read-a-word',
      commitMode: 'tap',
      glyph: 'ཀུ་ཤུ',
      options: [
        {itemId: 'vocab.apple', isAnswer: true},
        {itemId: 'vocab.twenty', isAnswer: false, label: 'twenty'},
        {itemId: 'vocab.place', isAnswer: false, label: 'place'},
        {itemId: 'vocab.hot', isAnswer: false, label: 'hot (of a drink)'},
      ],
    },
  },
};

describe('ReadAWord', () => {
  it('shows the word in script and asks what it says, in English options', () => {
    // When
    render(<ReadAWord entry={ENTRY} answered={null} itemsById={ITEMS} onCommit={() => {}} />);

    // Then
    expect(screen.getByText('What does it say?')).toBeTruthy();
    // The renderer inserts a break opportunity after the tsheg, so match a run
    expect(screen.getByText(/ཀུ/)).toBeTruthy();
    expect(screen.getByText('apple')).toBeTruthy();
    expect(screen.getByText('twenty')).toBeTruthy();
  });

  it('commits on the tap itself', () => {
    // Given
    const onCommit = vi.fn();
    render(<ReadAWord entry={ENTRY} answered={null} itemsById={ITEMS} onCommit={onCommit} />);

    // When
    fireEvent.click(screen.getByText('apple'));

    // Then
    expect(onCommit).toHaveBeenCalledWith({kind: 'tap', itemId: 'vocab.apple'});
  });

  it('takes no second tap once the band is up', () => {
    // Given
    const onCommit = vi.fn();
    render(
      <ReadAWord
        entry={ENTRY}
        answered={{key: '0', verdict: 'wrong', answerItemId: 'vocab.apple'}}
        itemsById={ITEMS}
        onCommit={onCommit}
      />,
    );

    // When
    fireEvent.click(screen.getByText('apple'));

    // Then
    expect(onCommit).not.toHaveBeenCalled();
  });
});
