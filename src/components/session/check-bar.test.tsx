/**
 * @fileoverview CheckBar's contract — disabled until a pick, commits the picks
 * as one Check, and the partial band names what is still missing, never what
 * was found (docs/03 §2). Phases per docs/11.
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import {CheckBar, stillMissing} from './check-bar';

describe('CheckBar', () => {
  it('stays disabled until at least one pick is made', () => {
    // Given
    const onCommit = vi.fn();
    render(
      <CheckBar
        picked={[]}
        filled={[]}
        answers={['a', 'b']}
        attempted={false}
        onCommit={onCommit}
      />,
    );

    // When
    fireEvent.click(screen.getByText('Check'));

    // Then
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits every pick as one Check input', () => {
    // Given
    const onCommit = vi.fn();
    render(
      <CheckBar
        picked={['a', 'c']}
        filled={[]}
        answers={['a', 'b']}
        attempted={false}
        onCommit={onCommit}
      />,
    );

    // When
    fireEvent.click(screen.getByText('Check these two'));

    // Then
    expect(onCommit).toHaveBeenCalledWith({kind: 'check', picked: ['a', 'c']});
  });

  it('names how many are still missing after an incomplete Check, and no tally', () => {
    // When
    render(
      <CheckBar
        picked={['a']}
        filled={['a']}
        answers={['a', 'b', 'c']}
        attempted
        onCommit={() => {}}
      />,
    );

    // Then
    expect(screen.getByText('Two are still missing.')).toBeTruthy();
    expect(screen.queryByText(/found/)).toBeNull();
  });

  it('keeps the partial band down before any Check was tried', () => {
    // When
    render(
      <CheckBar
        picked={['a']}
        filled={[]}
        answers={['a', 'b']}
        attempted={false}
        onCommit={() => {}}
      />,
    );

    // Then
    expect(screen.queryByText(/still missing/)).toBeNull();
  });

  it('prefers the caller-supplied partial sentence', () => {
    // When
    render(
      <CheckBar
        picked={['a']}
        filled={[]}
        answers={['a', 'b']}
        attempted
        partial="ས belongs on top of the ག here, not in front of it."
        onCommit={() => {}}
      />,
    );

    // Then
    expect(screen.queryByText(/still missing/)).toBeNull();
  });

  it('words the missing count as the board words it', () => {
    // Then
    expect(stillMissing(1)).toBe('One is still missing.');
    expect(stillMissing(2)).toBe('Two are still missing.');
  });
});
