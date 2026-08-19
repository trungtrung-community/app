/**
 * @fileoverview G1-G3 collection screens: the shelves, one shelf's cards, and the
 * cultural card. Renders the real route screens against the real fixture, with
 * expo-router mocked at the module seam. Phases per docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Collection from '../../app/(tabs)/collection/index';
import CollectionDetail from '../../app/(tabs)/collection/[id]';
import Card from '../../app/card/[collectionId]/[ordinal]';
import {renderScreen} from './render';
import type {ItemId} from '../../src/domain/item';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {Progress} from '../../src/ports/progress-store';
import {useProgress} from '../../src/store/progress';

const {push} = vi.hoisted(() => ({push: vi.fn()}));
const params = vi.hoisted(() => ({current: {} as Record<string, string>}));

vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
  useLocalSearchParams: () => params.current,
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** vocab.pill met, so its card in `collection.medicine` reads as found. */
const PILL_FOUND: Progress = {
  ...EMPTY,
  items: {
    'vocab.pill': {
      itemId: 'vocab.pill' as ItemId,
      state: 'met',
      correctOn: [],
      missedOn: [],
      intervalIndex: 0,
      dueOn: null,
    },
  },
};

beforeEach(() => {
  resetContainer();
  override('content', new JsonContentSource(fixture as unknown as ContentFixture));
  useProgress.setState({progress: null});
  push.mockClear();
  params.current = {};
});

describe('the shelves', () => {
  it('names every collection with a found count, in counts not percentages', async () => {
    // When
    renderScreen(<Collection />);

    // Then
    expect(await screen.findByText('The house of medicine')).toBeTruthy();
    expect(screen.getByText('0 of 4 found')).toBeTruthy();
    expect(screen.getByText('The Eight Auspicious Symbols')).toBeTruthy();
    expect(screen.getByText('0 of 8 found')).toBeTruthy();
  });

  it('names the home ground when nothing is found yet', async () => {
    // When
    renderScreen(<Collection />);

    // Then
    expect(
      await screen.findByText('Found while walking through The Medicine Room.'),
    ).toBeTruthy();
  });

  it('opens a collection from its row', async () => {
    // Given
    renderScreen(<Collection />);
    const row = await screen.findByRole('button', {name: 'The house of medicine'});

    // When
    fireEvent.click(row);

    // Then
    expect(push).toHaveBeenCalledWith('/collection/collection.medicine');
  });
});

describe('the collection detail', () => {
  beforeEach(() => {
    params.current = {id: 'collection.medicine'};
  });

  it('shows every card the collection holds', async () => {
    // When
    renderScreen(<CollectionDetail />);

    // Then
    expect(await screen.findByText('Humours')).toBeTruthy();
    expect(screen.getByText('myrobalan')).toBeTruthy();
    expect(screen.getByText('herbal pill')).toBeTruthy();
  });

  it('leaves every card inert with an empty progress snapshot', async () => {
    // Given
    renderScreen(<CollectionDetail />);
    await screen.findByText('herbal pill');

    // Then — pre-engine, nothing has been found, so nothing presses.
    expect(screen.queryByRole('button', {name: 'Humours'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'myrobalan'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'herbal pill'})).toBeNull();
  });

  it('opens the card screen for a found item', async () => {
    // Given
    useProgress.setState({progress: PILL_FOUND});
    renderScreen(<CollectionDetail />);
    const found = await screen.findByRole('button', {name: 'herbal pill'});

    // When
    fireEvent.click(found);

    // Then
    expect(push).toHaveBeenCalledWith('/card/collection.medicine/3');
  });
});

describe('the cultural card', () => {
  beforeEach(() => {
    params.current = {collectionId: 'collection.medicine', ordinal: '3'};
  });

  it("shows the item's Tibetan, the cultural note, and where it was found", async () => {
    // When
    renderScreen(<Card />);

    // Then
    expect(await screen.findByLabelText('rilpu')).toBeTruthy();
    expect(screen.getByText(/usual form a Tibetan prescription/)).toBeTruthy();
    expect(screen.getByText('Found at The Medicine Room')).toBeTruthy();
  });

  it('shows the illustration slot only when the card has one', async () => {
    // When — ordinal 3 (the pill) is illustrated.
    renderScreen(<Card />);

    // Then
    expect(await screen.findByTestId('card-illustration')).toBeTruthy();
  });

  it('renders an unillustrated card without an image slot', async () => {
    // Given — ordinal 1 (myrobalan) carries no illustration.
    params.current = {collectionId: 'collection.medicine', ordinal: '1'};

    // When
    renderScreen(<Card />);

    // Then
    await screen.findByText(/Myrobalan appears more often/);
    expect(screen.queryByTestId('card-illustration')).toBeNull();
  });
});
