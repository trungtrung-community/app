/**
 * @fileoverview SeeItSayIt's contract — the glyph asks, the names answer, a tap
 * commits (R5 / RB7, tap-select per docs/03 §5.2). Phases per docs/11.
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {ContentItemId} from '../../ports/content-ids';
import type {DisplayItem} from '../../usecases/display-item';
import {SeeItSayIt} from './see-it-say-it';
import type {Items, SessionEntry} from './types';

function letterItem(id: string, bo: string, name: string): [ContentItemId, DisplayItem] {
  return [
    id as ContentItemId,
    {id: id as ContentItemId, kind: 'letter', bo, roman: name, en: name},
  ];
}

const ITEMS: Items = new Map([
  letterItem('letter.dreng-bu', 'ཨེ', 'dreng bu'),
  letterItem('letter.na-ro', 'ཨོ', 'na ro'),
]);

const ENTRY: SessionEntry = {
  key: '0',
  ask: 'first',
  position: {
    kind: 'exercise',
    exercise: {
      exerciseId: 'ex.1.1.005',
      itemId: 'letter.dreng-bu',
      exerciseType: 'see-it-say-it',
      presentation: 'see-it-say-it',
      commitMode: 'tap',
      options: [
        {itemId: 'letter.dreng-bu', isAnswer: true},
        {itemId: 'letter.na-ro', isAnswer: false},
      ],
    },
  },
};

describe('SeeItSayIt', () => {
  it('shows the glyph, asks how it sounds, and offers the letter names', () => {
    // When
    render(<SeeItSayIt entry={ENTRY} answered={null} itemsById={ITEMS} onCommit={() => {}} />);

    // Then
    expect(screen.getByText('How does this sound?')).toBeTruthy();
    expect(screen.getByText('ཨེ')).toBeTruthy();
    expect(screen.getByText('dreng bu')).toBeTruthy();
    expect(screen.getByText('na ro')).toBeTruthy();
  });

  it('commits on the tap itself', () => {
    // Given
    const onCommit = vi.fn();
    render(<SeeItSayIt entry={ENTRY} answered={null} itemsById={ITEMS} onCommit={onCommit} />);

    // When
    fireEvent.click(screen.getByText('na ro'));

    // Then
    expect(onCommit).toHaveBeenCalledWith({kind: 'tap', itemId: 'letter.na-ro'});
  });

  it('takes no second tap once the band is up', () => {
    // Given
    const onCommit = vi.fn();
    render(
      <SeeItSayIt
        entry={ENTRY}
        answered={{key: '0', verdict: 'correct', answerItemId: 'letter.dreng-bu'}}
        itemsById={ITEMS}
        onCommit={onCommit}
      />,
    );

    // When
    fireEvent.click(screen.getByText('dreng bu'));

    // Then
    expect(onCommit).not.toHaveBeenCalled();
  });
});
