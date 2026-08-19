/**
 * @fileoverview SortWhatChanged's contract — the stop's whole set as toggleable
 * pairs, bare beside affixed, committing on Check; right picks stay and wrong
 * picks return when the engine keeps only the right ones (RB17). Phases per
 * docs/11.
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {SessionEntry} from './types';
import {SortWhatChanged} from './sort-what-changed';

const ENTRY: SessionEntry = {
  key: '0',
  ask: 'first',
  position: {
    kind: 'exercise',
    exercise: {
      exerciseId: 'ex.6.1.019',
      itemId: null,
      exerciseType: 'sort-what-changed',
      presentation: 'sort-what-changed',
      commitMode: 'check',
      question: 'Which of these did the ར change?',
      answers: ['stack.rga', 'stack.rnga'],
      pairs: [
        {itemId: 'stack.rka', bo: 'རྐ', roman: 'ka', bareBo: 'ཀ', bareRoman: 'ka', changed: false},
        {
          itemId: 'stack.rga',
          bo: 'རྒ',
          roman: 'ga',
          bareBo: 'ག',
          bareRoman: 'khaa',
          changed: true,
        },
        {
          itemId: 'stack.rnga',
          bo: 'རྔ',
          roman: 'ngha',
          bareBo: 'ང',
          bareRoman: 'nga',
          changed: true,
        },
      ],
      options: [],
    },
  },
};

describe('SortWhatChanged', () => {
  it('shows every pair bare beside affixed, and asks the stop question', () => {
    // When
    render(<SortWhatChanged entry={ENTRY} answered={null} filled={[]} onCommit={() => {}} />);

    // Then
    expect(screen.getByText(/Which of these did the/)).toBeTruthy();
    expect(screen.getByText(/རྐ/)).toBeTruthy();
    expect(screen.getByText(/ཀ/)).toBeTruthy();
    expect(screen.getByText('khaa')).toBeTruthy();
    expect(screen.getByText('ga')).toBeTruthy();
  });

  it('commits the toggled pairs as one Check', () => {
    // Given
    const onCommit = vi.fn();
    render(<SortWhatChanged entry={ENTRY} answered={null} filled={[]} onCommit={onCommit} />);
    const rows = screen.getAllByRole('checkbox');

    // When
    fireEvent.click(rows[1] as HTMLElement);
    fireEvent.click(rows[2] as HTMLElement);
    fireEvent.click(screen.getByText('Check these two'));

    // Then
    expect(onCommit).toHaveBeenCalledWith({kind: 'check', picked: ['stack.rga', 'stack.rnga']});
  });

  it('keeps the right pick and returns the wrong one after an incomplete Check', () => {
    // Given
    const onCommit = vi.fn();
    const view = render(
      <SortWhatChanged entry={ENTRY} answered={null} filled={[]} onCommit={onCommit} />,
    );
    const rows = screen.getAllByRole('checkbox');
    fireEvent.click(rows[0] as HTMLElement);
    fireEvent.click(rows[1] as HTMLElement);
    fireEvent.click(screen.getByText('Check these two'));

    // When
    // The engine kept the right pick only
    view.rerender(
      <SortWhatChanged entry={ENTRY} answered={null} filled={['stack.rga']} onCommit={onCommit} />,
    );

    // Then
    const after = screen.getAllByRole('checkbox');
    expect((after[0] as HTMLElement).getAttribute('aria-checked')).toBe('false');
    expect((after[1] as HTMLElement).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('One is still missing.')).toBeTruthy();
  });

  it('locks the rows once answered', () => {
    // Given
    render(
      <SortWhatChanged
        entry={ENTRY}
        answered={{key: '0', verdict: 'correct', answerItemId: null}}
        filled={[]}
        onCommit={() => {}}
      />,
    );

    // Then
    expect(screen.queryByText(/Check these/)).toBeNull();
    expect(screen.queryByText('Check')).toBeNull();
  });
});
