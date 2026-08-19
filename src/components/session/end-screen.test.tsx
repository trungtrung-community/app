/**
 * @fileoverview EndScreen's contract — the R11 recap draws one row per pair,
 * bare beside affixed with the change marked, exactly the stop's own set;
 * without a recap the S8 shape stands unchanged. Phases per docs/11.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import type {Items, RecapPair} from './types';
import {EndScreen} from './end-screen';

const NO_ITEMS: Items = new Map();

const RECAP: readonly RecapPair[] = [
  {itemId: 'stack.rka', bo: 'རྐ', roman: 'ka', bareBo: 'ཀ', bareRoman: 'ka', changed: false},
  {itemId: 'stack.rga', bo: 'རྒ', roman: 'ga', bareBo: 'ག', bareRoman: 'khaa', changed: true},
];

describe('EndScreen', () => {
  it('draws the R11 recap: one row per pair, the changed ones marked, no score', () => {
    // When
    render(
      <EndScreen
        taught={[]}
        stillMissed={[]}
        capabilities={['Read a stack with ར on top']}
        recap={RECAP}
        itemsById={NO_ITEMS}
        onDone={() => {}}
      />,
    );

    // Then
    expect(screen.getByText('All of them, together')).toBeTruthy();
    expect(screen.getByText(/རྒ/)).toBeTruthy();
    expect(screen.getByText(/ག/)).toBeTruthy();
    expect(screen.getByText('changed')).toBeTruthy();
    expect(screen.getByText('unchanged')).toBeTruthy();
    // Never scored: no percentage, no count of the sort
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it('keeps the S8 shape when the stop ends on no contrast', () => {
    // When
    render(
      <EndScreen
        taught={[]}
        stillMissed={[]}
        capabilities={['Greet']}
        itemsById={NO_ITEMS}
        onDone={() => {}}
      />,
    );

    // Then
    expect(screen.getByText('Stop complete')).toBeTruthy();
    expect(screen.queryByText('All of them, together')).toBeNull();
  });
});
