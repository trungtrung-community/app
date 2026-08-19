/**
 * @fileoverview B2 district hub — Stops, Words, Phrases and Cards for one place on
 * the Speak map. Renders the real route against the real fixture. Phases per
 * docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import DistrictHub from '../../app/(tabs)/journey/district/[slug]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {Progress} from '../../src/ports/progress-store';
import {useProgress} from '../../src/store/progress';

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** Every stop of district `core`, in fixture order. */
const CORE_STOPS = (fixture as unknown as {stop: {id: string; district_id: string | null}[]}).stop
  .filter(stop => stop.district_id === 'district.core')
  .map(stop => stop.id);

const {push, params} = vi.hoisted(() => ({push: vi.fn(), params: {slug: 'core'}}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
  useLocalSearchParams: () => params,
}));

describe('the district hub', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    params.slug = 'core';
    push.mockClear();
    useProgress.setState({progress: null});
  });

  it('shows the district name and number', async () => {
    // When
    renderScreen(<DistrictHub />);

    // Then
    expect(await screen.findByText('First Words')).toBeTruthy();
    expect(screen.getByText('District 1')).toBeTruthy();
  });

  it('shows stop rows for the default Stops view', async () => {
    // When
    renderScreen(<DistrictHub />);

    // Then
    expect(await screen.findByText('Hello, and a way out')).toBeTruthy();
    expect(screen.getByText('The greeting, answered')).toBeTruthy();
  });

  it('switches to Words and lists word rows from the fixture', async () => {
    // Given
    renderScreen(<DistrictHub />);
    await screen.findByText('First Words');

    // When
    fireEvent.click(screen.getByRole('tab', {name: 'Words'}));

    // Then
    expect(await screen.findByRole('button', {name: 'trashi delek'})).toBeTruthy();
  });

  it('switches to Phrases and lists phrase rows from the fixture', async () => {
    // Given
    renderScreen(<DistrictHub />);
    await screen.findByText('First Words');

    // When
    fireEvent.click(screen.getByRole('tab', {name: 'Phrases'}));

    // Then
    expect(
      await screen.findByRole('button', {name: 'ka dri shiik shuu na drikkire pe'}),
    ).toBeTruthy();
  });

  it('switches to Cards and points forward to the collection', async () => {
    // Given
    renderScreen(<DistrictHub />);
    await screen.findByText('First Words');

    // When
    fireEvent.click(screen.getByRole('tab', {name: 'Cards'}));

    // Then
    expect(await screen.findByText('Cards you find here join your collection')).toBeTruthy();
  });

  it('pushes the word sheet from a word row', async () => {
    // Given
    renderScreen(<DistrictHub />);
    await screen.findByText('First Words');
    fireEvent.click(screen.getByRole('tab', {name: 'Words'}));
    const row = await screen.findByRole('button', {name: 'trashi delek'});

    // When
    fireEvent.click(row);

    // Then
    expect(push).toHaveBeenCalledWith('/word/vocab.tashi-delek');
  });

  it('pushes search from the header icon', async () => {
    // Given
    renderScreen(<DistrictHub />);
    await screen.findByText('First Words');

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Search'}));

    // Then
    expect(push).toHaveBeenCalledWith('/search');
  });

  it('states what opens a locked district and greys its stops', async () => {
    // Given
    params.slug = 'meeting';

    // When
    renderScreen(<DistrictHub />);

    // Then — the district still shows its stops, greyed, rather than hiding them.
    expect(await screen.findByText('Finish First Words to walk here.')).toBeTruthy();
    expect(screen.getByText('Names, and where you are from')).toBeTruthy();
  });

  it('walks into the first stop from its row', async () => {
    // Given — a fresh district: the first stop is the walkable one
    renderScreen(<DistrictHub />);
    const row = await screen.findByRole('button', {name: /Hello, and a way out/});

    // When
    fireEvent.click(row);

    // Then
    expect(push).toHaveBeenCalledWith('/stop/stop.core.c1.1');
  });

  it('keeps stops beyond the next one inert', async () => {
    // When
    renderScreen(<DistrictHub />);
    await screen.findByText('Hello, and a way out');

    // Then
    expect(screen.queryByRole('button', {name: /The greeting, answered/})).toBeNull();
  });

  it('opens the next stop once the one before is done', async () => {
    // Given
    useProgress.setState({progress: {...EMPTY, completedStops: ['stop.core.c1.1']}});
    renderScreen(<DistrictHub />);
    const next = await screen.findByRole('button', {name: /The greeting, answered/});

    // When
    fireEvent.click(next);

    // Then
    expect(push).toHaveBeenCalledWith('/stop/stop.core.c1.2');
  });

  it('opens a district once the one before it is finished', async () => {
    // Given — every stop of district 1 done
    useProgress.setState({progress: {...EMPTY, completedStops: CORE_STOPS}});
    params.slug = 'meeting';

    // When
    renderScreen(<DistrictHub />);

    // Then
    expect(await screen.findByRole('button', {name: /Names, and where you are from/})).toBeTruthy();
    expect(screen.queryByText(/to walk here/)).toBeNull();
  });

  it('opens the done-stop sheet, and its second action carries the counts', async () => {
    // Given
    useProgress.setState({progress: {...EMPTY, completedStops: ['stop.core.c1.1']}});
    renderScreen(<DistrictHub />);
    const done = await screen.findByRole('button', {name: /Hello, and a way out/});

    // When — a done stop opens the sheet rather than walking straight in
    fireEvent.click(done);

    // Then
    expect(await screen.findByText('Do this stop again')).toBeTruthy();
    expect(screen.getByText('Practise this stop · 8 words · 4 phrases')).toBeTruthy();
    expect(push).not.toHaveBeenCalled();

    // When — the practice door
    fireEvent.click(screen.getByText('Practise this stop · 8 words · 4 phrases'));

    // Then
    expect(push).toHaveBeenCalledWith('/practice/picker?pool=stop:stop.core.c1.1&entry=district');
  });
});
