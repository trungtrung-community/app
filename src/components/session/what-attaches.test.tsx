/**
 * @fileoverview WhatAttaches' contract — the twelve affixes as a grouped
 * multi-select over the root, committing on Check; RB10·½'s partial state
 * names how many are still missing. Phases per docs/11.
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {SessionEntry} from './types';
import {WhatAttaches} from './what-attaches';

const ENTRY: SessionEntry = {
  key: '0',
  ask: 'first',
  position: {
    kind: 'exercise',
    exercise: {
      exerciseId: 'ex.8.3.001',
      itemId: 'letter.nya',
      exerciseType: 'what-attaches',
      presentation: 'what-attaches',
      commitMode: 'check',
      question: 'What can attach to this letter?',
      root: 'ཉ',
      answers: ['prefix:ག', 'prefix:མ', 'superscript:ར', 'superscript:ས', 'subscript:ཝ'],
      options: [],
    },
  },
};

describe('WhatAttaches', () => {
  it('offers the twelve affixes in their three groups over the root', () => {
    // When
    render(<WhatAttaches entry={ENTRY} answered={null} filled={[]} onCommit={() => {}} />);

    // Then
    expect(screen.getByText('What can attach to this letter?')).toBeTruthy();
    expect(
      screen.getByText('Pick everything. There may be more than one of each kind.'),
    ).toBeTruthy();
    expect(screen.getByText('Prefixes · in front')).toBeTruthy();
    expect(screen.getByText('Superscripts · on top')).toBeTruthy();
    expect(screen.getByText('Subscripts · underneath')).toBeTruthy();
    // Twelve chips: five prefixes, three superscripts, four subjoined forms
    expect(screen.getAllByRole('button')).toHaveLength(13); // 12 chips + Check
  });

  it('commits the picked slot-qualified affixes as one Check', () => {
    // Given
    const onCommit = vi.fn();
    render(<WhatAttaches entry={ENTRY} answered={null} filled={[]} onCommit={onCommit} />);

    // When
    fireEvent.click(screen.getByText('ག'));
    fireEvent.click(screen.getByText('◌ྭ'));
    fireEvent.click(screen.getByText('Check these two'));

    // Then
    expect(onCommit).toHaveBeenCalledWith({kind: 'check', picked: ['prefix:ག', 'subscript:ཝ']});
  });

  it('keeps the filled picks and names how many are still missing', () => {
    // Given
    const onCommit = vi.fn();
    const view = render(
      <WhatAttaches entry={ENTRY} answered={null} filled={[]} onCommit={onCommit} />,
    );
    fireEvent.click(screen.getByText('ག'));
    fireEvent.click(screen.getByText('◌ླ'));
    fireEvent.click(screen.getByText('Check these two'));

    // When
    // The engine kept the right pick; the wrong one returns to place
    view.rerender(
      <WhatAttaches entry={ENTRY} answered={null} filled={['prefix:ག']} onCommit={onCommit} />,
    );

    // Then
    expect(screen.getByText('Four are still missing.')).toBeTruthy();
  });

  it('marks the whole correct set once answered, and takes no more picks', () => {
    // Given
    const onCommit = vi.fn();
    render(
      <WhatAttaches
        entry={ENTRY}
        answered={{key: '0', verdict: 'correct', answerItemId: null}}
        filled={[]}
        onCommit={onCommit}
      />,
    );

    // When
    fireEvent.click(screen.getByText('ག'));

    // Then
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.queryByText(/Check/)).toBeNull();
  });
});
