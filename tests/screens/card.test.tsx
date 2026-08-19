/**
 * @fileoverview G3 card screen with the H1 share sheet. Renders the real route against
 * the real fixture; the share seam is mocked at its module, which is the one double a
 * screen test is allowed — the seam's own suite proves what stands behind it.
 */

import {fireEvent, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Card from '../../app/card/[collectionId]/[ordinal]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import {copyTibetan, shareCardImage} from '../../src/composition/share';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';

const {params} = vi.hoisted(() => ({params: {collectionId: 'collection.eat', ordinal: '4'}}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => params,
}));

// The seam, not the modules behind it: `canShareCard` is true so the entry renders,
// which on the web build it deliberately would not.
vi.mock('../../src/composition/share', () => ({
  canShareCard: true,
  copyTibetan: vi.fn(async () => {}),
  shareCardImage: vi.fn(async () => {}),
}));

async function openShareSheet(): Promise<void> {
  fireEvent.click(await screen.findByTestId('card-share'));
  await screen.findByText('Share this card');
}

describe('the card screen share flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    params.collectionId = 'collection.eat';
    params.ordinal = '4';
  });

  it('opens a sheet with the three board rows and the small preview', async () => {
    // Given
    renderScreen(<Card />);

    // When
    await openShareSheet();

    // Then
    expect(screen.getByText('Save image')).toBeTruthy();
    expect(screen.getByText('A square card, 1:1')).toBeTruthy();
    expect(screen.getByText('Share')).toBeTruthy();
    expect(screen.getByText('Anywhere your phone can send it')).toBeTruthy();
    expect(screen.getByText('Copy the Tibetan')).toBeTruthy();
    expect(screen.getByText(/ready to paste into a message/)).toBeTruthy();
    expect(screen.getByTestId('card-share-preview')).toBeTruthy();
  });

  it('copies the Tibetan and confirms with the toast', async () => {
    // Given
    renderScreen(<Card />);
    await openShareSheet();

    // When
    fireEvent.click(screen.getByTestId('share-copy'));

    // Then
    await waitFor(() => expect(copyTibetan).toHaveBeenCalledWith('སྡོང་མོ'));
    expect(await screen.findByText('Copied')).toBeTruthy();
  });

  it('sends the square export through the seam from the first row', async () => {
    // Given
    renderScreen(<Card />);
    await openShareSheet();

    // When
    fireEvent.click(screen.getByTestId('share-square'));

    // Then
    await waitFor(() => expect(shareCardImage).toHaveBeenCalledTimes(1));
    const call = vi.mocked(shareCardImage).mock.calls[0];
    expect(call?.[0]).toHaveProperty('current');
    expect(call?.[1]).toBe('square');
    expect(call?.[2]).toBe('the tea churn');
  });

  it('sends the story export through the seam from the second row', async () => {
    // Given
    renderScreen(<Card />);
    await openShareSheet();

    // When
    fireEvent.click(screen.getByTestId('share-story'));

    // Then
    await waitFor(() => expect(shareCardImage).toHaveBeenCalledTimes(1));
    expect(vi.mocked(shareCardImage).mock.calls[0]?.[1]).toBe('story');
  });

  it('offers no share entry on a card with no Tibetan', async () => {
    // Given
    params.collectionId = 'collection.calendar';
    params.ordinal = '0';

    // When
    renderScreen(<Card />);

    // Then
    await screen.findByText('Day names');
    expect(screen.queryByTestId('card-share')).toBeNull();
  });
});
