/**
 * @fileoverview AnswerChoice's contract — what an answer row promises when it is pressed.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {AnswerChoice} from './answer-choice';

describe('AnswerChoice', () => {
  it('is a button and never a radio', () => {
    // A radio promises that pressing again deselects, which is wrong once an answer has
    // been judged — and it cannot carry a correct/wrong state or a shortcut number.

    // When
    render(<AnswerChoice index={1} tibetan="བཀྲ་ཤིས" roman="trashi" onPress={() => {}} />);

    // Then
    const row = screen.getByRole('button');
    expect(row.getAttribute('role')).toBe('button');
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('takes its name from the romanization, not the glyph', () => {
    // When
    render(<AnswerChoice tibetan="བཀྲ་ཤིས" roman="trashi" onPress={() => {}} />);

    // Then
    expect(screen.getByLabelText('trashi')).toBeTruthy();
  });

  it('marks a judged answer and leaves a selected one unmarked', () => {
    // Soft accent, no tick: the learner has chosen but nothing has been judged, and a tick
    // before checking would answer the question for them.

    // When
    const {unmount} = render(<AnswerChoice state="selected" roman="trashi" />);

    // Then
    expect(screen.getByRole('button').getAttribute('aria-selected')).toBe('true');

    // When
    unmount();
    render(<AnswerChoice state="correct" roman="trashi" />);

    // Then
    expect(screen.getByRole('button').getAttribute('aria-selected')).toBe('false');
  });
});
