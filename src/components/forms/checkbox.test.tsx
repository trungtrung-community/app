/**
 * @fileoverview Checkbox's contract, and the two React Native traps it shipped with.
 *
 * Both are written up in `docs/11-testing-conventions.md` — "the state that never reaches
 * the DOM" and "flex: 0 is not width: 0". Checkbox is the only component that hit both.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {Checkbox} from './checkbox';

describe('Checkbox', () => {
  it('says it is checked', () => {
    // When
    render(<Checkbox checked label="Show the spelling" onChange={() => {}} />);

    // Then
    expect(screen.getByRole('checkbox').getAttribute('aria-checked')).toBe('true');
  });

  it('is not collapsed by its own layout', () => {
    // `flex: 0` is `flex-basis: 0%`, which outranks `width` on a flex item. It produced a
    // 26pt indicator that rendered at nothing on web and at 26 on a device, and typechecked.

    // When
    const {container} = render(<Checkbox checked label="Show the spelling" onChange={() => {}} />);

    // Then
    const boxes = [...container.querySelectorAll('div')].filter(node =>
      /width:\s*26px/.test(node.getAttribute('style') ?? ''),
    );
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      expect(box.getAttribute('style')).not.toMatch(/flex:\s*0(?!\.)/);
    }
  });
});
