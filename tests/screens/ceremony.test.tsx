/**
 * @fileoverview The three ceremony screens — S9 walk-scoped with the product's
 * one exclamation mark, J3's teal arrival paging to J4's return, F-A's two
 * doors — and none of them mounting confetti. Phases per docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import DistrictCeremony from '../../app/ceremony/district';
import FinaleCeremony from '../../app/ceremony/finale';
import FirstWalkCeremony from '../../app/ceremony/first-walk';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';

const {replace} = vi.hoisted(() => ({replace: vi.fn()}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({slug: 'core', circuit: '1'}),
  useRouter: () => ({replace}),
}));

// None of the three screens import Confetti; if one ever does, this spy renders
// and the queryByTestId assertions below fail. S12 is the only burst.
vi.mock('../../src/components/feedback/confetti', async () => {
  const react = await import('react');
  return {
    Confetti: () => react.createElement('div', {'data-testid': 'confetti-spy'}),
  };
});

describe('the ceremony screens', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    replace.mockClear();
  });

  it('celebrates the first-walk district without saying complete, with the one exclamation mark', async () => {
    // When
    renderScreen(<DistrictCeremony />);

    // Then
    expect(await screen.findByRole('heading', {name: 'First Words, walked!'})).toBeTruthy();
    expect(screen.queryByText(/complete/i)).toBeNull();
    expect((document.body.textContent ?? '').match(/!/g)).toHaveLength(1);
    expect(screen.queryByTestId('confetti-spy')).toBeNull();
  });

  it('walks on from the district to the journey', async () => {
    // Given
    renderScreen(<DistrictCeremony />);
    const walkOn = await screen.findByRole('button', {name: 'Walk on'});

    // When
    fireEvent.click(walkOn);

    // Then
    expect(replace).toHaveBeenCalledWith('/journey');
  });

  it('pages from the teal arrival to the return, then walks on', async () => {
    // Given
    renderScreen(<FirstWalkCeremony />);
    expect(screen.queryByTestId('crane-placeholder')).toBeNull();

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Now, the way back'}));

    // Then
    expect(screen.getByTestId('crane-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('confetti-spy')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Walk on'}));
    expect(replace).toHaveBeenCalledWith('/journey');
  });

  it('opens the finale doors to practice and to the walk, with no confetti', () => {
    // Given
    renderScreen(<FinaleCeremony />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Keep practising'}));
    fireEvent.click(screen.getByRole('button', {name: 'See your walk'}));

    // Then
    expect(replace).toHaveBeenNthCalledWith(1, '/practice');
    expect(replace).toHaveBeenNthCalledWith(2, '/you');
    expect(screen.queryByTestId('confetti-spy')).toBeNull();
  });
});
