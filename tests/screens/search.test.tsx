/**
 * @fileoverview Y4 search — type a query, see word and phrase rows, open a sheet.
 *
 * Renders the real route screen against the real fixture through the container,
 * with expo-router mocked at the module seam. Phases per docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Search from '../../app/search';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import {markTaught, newItem, type ItemId} from '../../src/domain/item';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {Progress} from '../../src/ports/progress-store';
import {useProgress} from '../../src/store/progress';

const {push} = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
}));

const PLACEHOLDER = 'Search words, phrases, cards';

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

function typeQuery(text: string): void {
  fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {target: {value: text}});
}

describe('the search screen', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    push.mockClear();
    useProgress.setState({progress: null});
  });

  it('points forward before a query', async () => {
    // When
    renderScreen(<Search />);

    // Then
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeTruthy();
    expect(await screen.findByText('Every word on the walk is here')).toBeTruthy();
  });

  it('lists matching word rows for a query', async () => {
    // Given
    renderScreen(<Search />);

    // When
    typeQuery('trashi');

    // Then
    expect(await screen.findByText('trashi delek')).toBeTruthy();
    expect(screen.getByText('Words')).toBeTruthy();
  });

  it('lists matching phrase rows for a query', async () => {
    // Given
    renderScreen(<Search />);

    // When
    typeQuery('thank');

    // Then
    expect(await screen.findByText('thukdjechhe')).toBeTruthy();
    expect(screen.getByText('Phrases')).toBeTruthy();
  });

  it('opens the word sheet from a row', async () => {
    // Given
    renderScreen(<Search />);
    typeQuery('trashi');
    const row = await screen.findByRole('button', {name: 'trashi delek'});

    // When
    fireEvent.click(row);

    // Then
    expect(push).toHaveBeenCalledWith('/word/vocab.tashi-delek');
  });

  it('fills the status dot of a word the learner has met', async () => {
    // Given — trashi delek is met
    const met = markTaught(newItem('vocab.tashi-delek' as ItemId));
    useProgress.setState({progress: {...EMPTY, items: {'vocab.tashi-delek': met}}});
    renderScreen(<Search />);

    // When
    typeQuery('trashi');

    // Then — the dot is solid, not the hollow ring a new word carries
    const row = await screen.findByRole('button', {name: 'trashi delek'});
    const dot = row.querySelector('[aria-hidden="true"]') as HTMLElement | null;
    expect(dot).not.toBeNull();
    // A hollow dot's fill is `transparent`, which the web renderer writes as
    // fully transparent black.
    expect(dot?.style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('says when a query finds nothing', async () => {
    // Given
    renderScreen(<Search />);

    // When
    typeQuery('zzzzzz');

    // Then
    expect(await screen.findByText('Nothing by that name yet')).toBeTruthy();
  });
});
