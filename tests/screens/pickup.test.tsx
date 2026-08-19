/**
 * @fileoverview N2 Opened from a notification — the pickup landing.
 *
 * Renders the real route screen against the real fixture through the container,
 * with expo-router mocked at the module seam. The assertions are the board's
 * rules: the stop name binds to curriculum data, *Pick it up* hands over to the
 * stop route, one tap goes back to the journey, and a stale notification's
 * unknown id redirects quietly rather than raising an error surface.
 */

import {fireEvent, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Pickup from '../../app/pickup/[stopId]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';

const {route, replace} = vi.hoisted(() => ({
  route: {stopId: 'stop.core.c1.1'},
  replace: vi.fn(),
}));
vi.mock('expo-router', () => ({
  useRouter: () => ({replace}),
  useLocalSearchParams: () => ({stopId: route.stopId}),
}));

beforeEach(() => {
  resetContainer();
  override('content', new JsonContentSource(fixture as unknown as ContentFixture));
  route.stopId = 'stop.core.c1.1';
  replace.mockClear();
});

describe('N2, opened from a notification', () => {
  it('binds the stop name from curriculum data', async () => {
    // When
    renderScreen(<Pickup />);

    // Then
    expect(await screen.findByRole('heading', {name: 'Hello, and a way out'})).toBeTruthy();
  });

  it('picks the stop up at the stop route', async () => {
    // Given
    renderScreen(<Pickup />);
    await screen.findByRole('heading', {name: 'Hello, and a way out'});

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Pick it up'}));

    // Then
    expect(replace).toHaveBeenCalledWith('/stop/stop.core.c1.1');
  });

  it('goes back to the journey in one tap', async () => {
    // Given
    renderScreen(<Pickup />);
    await screen.findByRole('heading', {name: 'Hello, and a way out'});

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Back to the journey'}));

    // Then
    expect(replace).toHaveBeenCalledWith('/journey');
  });

  it('redirects a stale notification quietly to the journey', async () => {
    // Given
    route.stopId = 'stop.gone.z9.9';

    // When
    renderScreen(<Pickup />);

    // Then
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/journey'));
    expect(screen.queryByText(/error|wrong|sorry/i)).toBeNull();
  });
});
