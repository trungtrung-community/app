/**
 * @fileoverview HearItFindIt's contract — an audio prompt asks, four bare
 * glyphs answer, a tap commits (RB6 / R3, tap-select per docs/03 §5.2).
 * Phases per docs/11.
 */

import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {ContentItemId} from '../../ports/content-ids';
import type {DisplayItem} from '../../usecases/display-item';
import {HearItFindIt} from './hear-it-find-it';
import type {Items, SessionEntry} from './types';

const play = vi.hoisted(() => ({
  playClip: vi.fn(),
  stopClip: vi.fn(),
}));
vi.mock('../../composition/play', () => play);

function letterItem(id: string, bo: string, name: string): [ContentItemId, DisplayItem] {
  return [
    id as ContentItemId,
    {id: id as ContentItemId, kind: 'letter', bo, roman: name, en: name},
  ];
}

const ITEMS: Items = new Map([
  letterItem('letter.ka', 'ཀ', 'ka'),
  letterItem('letter.kha', 'ཁ', 'kha'),
  letterItem('letter.ga', 'ག', 'ga'),
  letterItem('letter.nga', 'ང', 'nga'),
]);

const ENTRY: SessionEntry = {
  key: '0',
  ask: 'first',
  position: {
    kind: 'exercise',
    exercise: {
      exerciseId: 'ex.1',
      itemId: 'letter.ga',
      exerciseType: 'hear-it-find-it',
      presentation: 'hear-it-find-it',
      commitMode: 'tap',
      options: [
        {itemId: 'letter.ga', isAnswer: true},
        {itemId: 'letter.ka', isAnswer: false},
        {itemId: 'letter.kha', isAnswer: false},
        {itemId: 'letter.nga', isAnswer: false},
      ],
    },
  },
};

describe('HearItFindIt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    play.playClip.mockResolvedValue(undefined);
    play.stopClip.mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it('asks with sound and offers four bare glyphs', () => {
    // When
    render(<HearItFindIt entry={ENTRY} answered={null} itemsById={ITEMS} onCommit={() => {}} />);

    // Then
    // Glyphs only — the romanization would hand the answer over
    expect(screen.getByText('Which letter is this?')).toBeTruthy();
    expect(screen.getByLabelText('Play audio')).toBeTruthy();
    for (const glyph of ['ཀ', 'ཁ', 'ག', 'ང']) {
      expect(screen.getByText(glyph)).toBeTruthy();
    }
    expect(screen.queryByText('ga')).toBeNull();
  });

  it('commits on the tap itself', () => {
    // Given
    const onCommit = vi.fn();
    render(<HearItFindIt entry={ENTRY} answered={null} itemsById={ITEMS} onCommit={onCommit} />);

    // When
    fireEvent.click(screen.getByText('ཁ'));

    // Then
    expect(onCommit).toHaveBeenCalledWith({kind: 'tap', itemId: 'letter.kha'});
  });

  it('takes no second tap once the band is up', () => {
    // Given
    const onCommit = vi.fn();
    render(
      <HearItFindIt
        entry={ENTRY}
        answered={{key: '0', verdict: 'wrong', answerItemId: 'letter.ga'}}
        itemsById={ITEMS}
        onCommit={onCommit}
      />,
    );

    // When
    fireEvent.click(screen.getByText('ག'));

    // Then
    expect(onCommit).not.toHaveBeenCalled();
  });
});
