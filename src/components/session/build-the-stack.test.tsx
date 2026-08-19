/**
 * @fileoverview BuildTheStack's contract — §9.1a every clause a component can
 * prove: four fixed rows, a chip stays in the tray after placing, the
 * untouched vowel row is the inherent-a answer, Check commits the canonical
 * slot tokens, and a failed Check speaks RB12·✗'s register — a placement
 * error, never a wrong answer. Phases per docs/11.
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {SessionEntry} from './types';
import {BuildTheStack, buildPartialMessage} from './build-the-stack';

const THIRTY = ['ཀ', 'ཁ', 'ག', 'ང', 'ཅ', 'ཆ', 'ཇ', 'ཉ'];

const ENTRY: SessionEntry = {
  key: '0',
  ask: 'first',
  position: {
    kind: 'exercise',
    exercise: {
      exerciseId: 'ex.7.1.008',
      itemId: 'stack.kya',
      exerciseType: 'build-the-stack',
      presentation: 'build-the-stack',
      commitMode: 'check',
      glyph: 'ཀྱ',
      reading: 'kya',
      answers: ['root:ཀ', 'subscript:ཡ'],
      tray: {
        thirty: THIRTY,
        superscripts: ['ར', 'ལ', 'ས'],
        subscripts: ['◌ྱ', '◌ྲ', '◌ླ', '◌ྭ'],
        vowels: ['◌ི', '◌ུ', '◌ེ', '◌ོ'],
      },
      options: [],
    },
  },
};

describe('BuildTheStack', () => {
  it('draws the four fixed rows under the prompt, in tray order', () => {
    // When
    render(<BuildTheStack entry={ENTRY} answered={null} filled={[]} onCommit={() => {}} />);

    // Then
    expect(screen.getByText('Build the syllable.')).toBeTruthy();
    expect(screen.getByText(/Sounds like kya/)).toBeTruthy();
    expect(screen.getByText('The thirty')).toBeTruthy();
    expect(screen.getByText('On top')).toBeTruthy();
    expect(screen.getByText('Underneath')).toBeTruthy();
    // The inherent-a line rides the vowel row's label
    expect(screen.getByText('Vowel · no mark means a')).toBeTruthy();
    for (const chip of ['◌ྱ', '◌ི', 'ཀ']) {
      expect(screen.getAllByText(chip).length).toBeGreaterThan(0);
    }
  });

  it('places into the selected slot, and the chip stays in the tray', () => {
    // Given
    render(<BuildTheStack entry={ENTRY} answered={null} filled={[]} onCommit={() => {}} />);

    // When
    fireEvent.click(screen.getByLabelText('Root slot'));
    fireEvent.click(screen.getByText('ཀ'));

    // Then
    // Two ཀ on screen now: the placed copy and the tray's own, unconsumed
    expect(screen.getAllByText('ཀ')).toHaveLength(2);
  });

  it('commits the placements as canonical slot tokens, inherent a as absence', () => {
    // Given
    const onCommit = vi.fn();
    render(<BuildTheStack entry={ENTRY} answered={null} filled={[]} onCommit={onCommit} />);
    fireEvent.click(screen.getByLabelText('Root slot'));
    fireEvent.click(screen.getByText('ཀ'));
    fireEvent.click(screen.getByLabelText('Subscript slot'));
    fireEvent.click(screen.getByText('◌ྱ'));

    // When
    // The vowel row is untouched — that IS the answer
    fireEvent.click(screen.getByText('Check'));

    // Then
    expect(onCommit).toHaveBeenCalledWith({
      kind: 'check',
      picked: ['root:ཀ', 'subscript:ཡ'],
    });
  });

  it('returns only the misplaced chip after an incomplete Check', () => {
    // Given
    const onCommit = vi.fn();
    const view = render(
      <BuildTheStack entry={ENTRY} answered={null} filled={[]} onCommit={onCommit} />,
    );
    fireEvent.click(screen.getByLabelText('Root slot'));
    fireEvent.click(screen.getByText('ཀ'));
    fireEvent.click(screen.getByLabelText('Prefix slot'));
    fireEvent.click(screen.getByText('ས'));
    fireEvent.click(screen.getByText('Check'));

    // When
    // The engine kept the right placement only
    view.rerender(
      <BuildTheStack entry={ENTRY} answered={null} filled={['root:ཀ']} onCommit={onCommit} />,
    );

    // Then
    // ཀ stays placed (a second ཀ beside the tray's); the prefix slot re-opens
    expect(screen.getAllByText('ཀ')).toHaveLength(2);
    expect(screen.getByLabelText('Prefix slot')).toBeTruthy();
  });
});

describe('buildPartialMessage', () => {
  it('speaks RB12·✗: a placement error, never a wrong answer', () => {
    // Given — ས dropped into Prefix instead of Superscript, the rest right
    const checked = ['prefix:ས', 'root:ག'];
    const answers = ['superscript:ས', 'root:ག'];

    // When
    const message = buildPartialMessage(checked, answers);

    // Then — the board's own line, on the same error
    expect(message).toBe('ས belongs on top of the ག here, not in front of it. The rest is right.');
  });

  it('names what is still missing by slot, never counting what was found', () => {
    // When
    const message = buildPartialMessage(['root:ག', 'vowel:ི'], ['root:ག', 'vowel:ི', 'suffix:ན']);

    // Then
    expect(message).toBe('The suffix is still missing.');
  });

  it('sends a letter that belongs nowhere back, in RB10·½ words', () => {
    // When
    const message = buildPartialMessage(['root:ཀ', 'suffix:ཆ'], ['root:ཀ', 'subscript:ཡ']);

    // Then
    expect(message).toBe(
      'ཆ went back — it is not part of this syllable. The subscript is still missing.',
    );
  });
});
