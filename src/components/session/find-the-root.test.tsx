/**
 * @fileoverview FindTheRoot's contract — the positions of the one syllable in
 * writing order, a tap commits, and the answered stack dims everything but
 * the root with a caption naming it (RB9 / R8). Phases per docs/11.
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {SessionEntry} from './types';
import {FindTheRoot} from './find-the-root';

const ENTRY: SessionEntry = {
  key: '0',
  ask: 'first',
  position: {
    kind: 'exercise',
    exercise: {
      exerciseId: 'ex.7.2.008',
      itemId: 'stack.tra',
      exerciseType: 'find-the-root',
      presentation: 'find-the-root',
      commitMode: 'tap',
      glyph: 'ཏྲ',
      reason: 'A syllable with a single letter on the line is all root.',
      options: [
        // Arrives shuffled, as the engine ships every entry's options.
        {itemId: '1:ྲ', isAnswer: false},
        {itemId: '0:ཏ', isAnswer: true},
      ],
    },
  },
  // The per-entry shuffle — the renderer must ignore this order.
  options: [
    {itemId: '1:ྲ', isAnswer: false},
    {itemId: '0:ཏ', isAnswer: true},
  ],
};

describe('FindTheRoot', () => {
  it('asks for the root over the positions of the stack, in writing order', () => {
    // When
    render(<FindTheRoot entry={ENTRY} answered={null} onCommit={() => {}} />);

    // Then
    expect(screen.getByText('Which letter is the root?')).toBeTruthy();
    expect(screen.getByText('Everything else attaches to it.')).toBeTruthy();
    const buttons = screen.getAllByRole('button');
    // ཏ before ◌ྲ, whatever order the shuffle delivered
    expect(buttons.map(button => button.textContent)).toEqual(['ཏ', '◌ྲ']);
  });

  it('commits the tapped position', () => {
    // Given
    const onCommit = vi.fn();
    render(<FindTheRoot entry={ENTRY} answered={null} onCommit={onCommit} />);

    // When
    fireEvent.click(screen.getByText('◌ྲ'));

    // Then
    expect(onCommit).toHaveBeenCalledWith({kind: 'tap', itemId: '1:ྲ'});
  });

  it('captions the answered stack with the root it dims everything else around', () => {
    // When
    render(
      <FindTheRoot
        entry={ENTRY}
        answered={{key: '0', verdict: 'wrong', answerItemId: null}}
        onCommit={() => {}}
      />,
    );

    // Then
    // Dimming is colour-only, so the caption carries the name in text
    expect(screen.getAllByText(/root/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('root ཏ')).toBeTruthy();
  });

  it('takes no tap once answered', () => {
    // Given
    const onCommit = vi.fn();
    render(
      <FindTheRoot
        entry={ENTRY}
        answered={{key: '0', verdict: 'correct', answerItemId: null}}
        onCommit={onCommit}
      />,
    );

    // When
    // Several ཏ stand on the answered frame; any of them must be inert
    for (const element of screen.getAllByText('ཏ')) {
      fireEvent.click(element);
    }

    // Then
    expect(onCommit).not.toHaveBeenCalled();
  });
});
