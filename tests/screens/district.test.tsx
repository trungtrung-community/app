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
import {markTaught, newItem, type ItemId} from '../../src/domain/item';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {Progress} from '../../src/ports/progress-store';
import {useProgress} from '../../src/store/progress';

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** Drains pending promise chains without a real timer. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

/**
 * The fixture carries district 23 (`printing`) with no stops of its own and no
 * stops for district 22 before it, so B3's "reached" gate could never open. One
 * Post Office stop makes the district reachable when it is done, and one
 * printing phrase lets the invite's last-phrase bind be asserted.
 */
const B3_FIXTURE = {
  ...(fixture as unknown as ContentFixture),
  stop: [
    ...(fixture as unknown as ContentFixture).stop,
    {
      id: 'stop.postoffice.c1.1',
      track: 'speak',
      district_id: 'district.postoffice',
      section_id: 'section.speak.5',
      ordinal: 1,
      circuit: 1,
      node: null,
      shape: 'items',
      name: 'Stamps, and what they cost',
      outcome: 'You can buy a stamp.',
      capabilities_json: '[]',
      position_count: 0,
      complete: 1,
    },
  ],
  placement: [
    ...(fixture as unknown as ContentFixture).placement,
    {
      item_id: 'phrase.printing.teach-me',
      kind: 'phrase',
      district_id: 'district.printing',
      role: 'home',
    },
  ],
  phrase: [
    ...(fixture as unknown as ContentFixture).phrase,
    {
      id: 'phrase.printing.teach-me',
      slug: 'teach-me',
      district: 'printing',
      district_number: 23,
      bo: 'ང་ལ་སློབ་ཁྲིད་གནང་རོགས་གནང་།',
      roman: 'nga la lopthri nang ro nang',
      en: 'Please teach me.',
      en_definition: null,
      en_literal: null,
      usage_note: null,
      cultural_note: null,
      wylie: null,
      thl: null,
      register: 'honorific',
      illustration: null,
      artifact: 0,
      template: 0,
      status: 'draft',
      audio_path: 'audio/phrases/printing/teach-me.m4a',
      audio_available: 0,
    },
  ],
} as unknown as ContentFixture;

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

  it('shows the Printing House invite once reached, with the last phrase bound (B3)', async () => {
    // Given
    override('content', new JsonContentSource(B3_FIXTURE));
    params.slug = 'printing';
    useProgress.setState({progress: {...EMPTY, completedStops: ['stop.postoffice.c1.1']}});

    // When
    renderScreen(<DistrictHub />);

    // Then
    expect(await screen.findByText('Start the script')).toBeTruthy();
    expect(screen.getByText('Not now')).toBeTruthy();
    expect(
      screen.getByText(
        "The writing has been on every card you've collected. Want to learn to read it?",
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText('nga la lopthri nang ro nang')).toBeTruthy();
  });

  it('starts the Read walk at its first stop (B3)', async () => {
    // Given
    override('content', new JsonContentSource(B3_FIXTURE));
    params.slug = 'printing';
    useProgress.setState({progress: {...EMPTY, completedStops: ['stop.postoffice.c1.1']}});
    renderScreen(<DistrictHub />);
    const start = await screen.findByText('Start the script');

    // When
    fireEvent.click(start);

    // Then
    expect(push).toHaveBeenCalledWith('/stop/stop.1.1');
  });

  it('keeps the invite off an unreached district 23 (B3)', async () => {
    // Given
    override('content', new JsonContentSource(B3_FIXTURE));
    params.slug = 'printing';

    // When
    renderScreen(<DistrictHub />);

    // Then — the hub is drawn locked, and the invite never mounts
    expect(
      await screen.findByText("This district's stops arrive as the walk is written"),
    ).toBeTruthy();
    expect(screen.queryByText('Start the script')).toBeNull();
  });

  it('retires the invite once the Read track has progress (B3)', async () => {
    // Given
    override('content', new JsonContentSource(B3_FIXTURE));
    params.slug = 'printing';
    useProgress.setState({
      progress: {
        ...EMPTY,
        items: {'letter.ja': markTaught(newItem('letter.ja' as ItemId))},
        completedStops: ['stop.postoffice.c1.1'],
      },
    });

    // When
    renderScreen(<DistrictHub />);
    await screen.findByText('The Printing House');
    await flushMicrotasks();

    // Then
    expect(screen.queryByText('Start the script')).toBeNull();
  });

  it('goes away for the visit on Not now (B3)', async () => {
    // Given
    override('content', new JsonContentSource(B3_FIXTURE));
    params.slug = 'printing';
    useProgress.setState({progress: {...EMPTY, completedStops: ['stop.postoffice.c1.1']}});
    renderScreen(<DistrictHub />);
    await screen.findByText('Start the script');

    // When
    fireEvent.click(screen.getByText('Not now'));

    // Then
    expect(screen.queryByText('Start the script')).toBeNull();
    expect(push).not.toHaveBeenCalled();
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
