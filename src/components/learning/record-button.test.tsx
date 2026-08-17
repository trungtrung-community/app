/**
 * @fileoverview RecordButton's contract — each state named in the product's own words.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {RecordButton} from './record-button';

describe('RecordButton', () => {
  it('names each state in the product’s own words', () => {
    // Given — `playing` defaults to false, so stating it makes the fourth row differ from
    // the third in exactly the one prop under test.
    const cases = [
      {state: 'idle', playing: false, label: 'Record yourself'},
      {state: 'recording', playing: false, label: 'Stop recording'},
      {state: 'playback', playing: false, label: 'Play your recording'},
      {state: 'playback', playing: true, label: 'Pause your recording'},
    ] as const;

    // Then
    for (const {state, playing, label} of cases) {
      const {unmount} = render(<RecordButton state={state} playing={playing} />);
      expect(screen.getByLabelText(label)).toBeTruthy();
      unmount();
    }
  });
});
