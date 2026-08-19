/**
 * @fileoverview RBH Read section hub — Stops, Letters and Reference for one
 * chapter of the Read track. Renders the real route against the real fixture.
 * Phases per docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import ReadSectionHub from '../../app/(tabs)/journey/section/[number]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {Progress} from '../../src/ports/progress-store';
import {useProgress} from '../../src/store/progress';

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

const ROWS = fixture as unknown as {
  stop: {id: string; track: string; section_id: string; ordinal: number; name: string}[];
  letter: {id: string; letter_name: string | null; section: number}[];
};

/** Section 1's stops, in walking order, from the fixture. */
const SECTION_ONE_STOPS = ROWS.stop
  .filter(stop => stop.section_id === 'section.read.1')
  .sort((a, b) => a.ordinal - b.ordinal);

/** Section 6's stops, in walking order, from the fixture. */
const SECTION_SIX_STOPS = ROWS.stop
  .filter(stop => stop.section_id === 'section.read.6')
  .sort((a, b) => a.ordinal - b.ordinal);

/** The letters section 1 teaches, from the fixture. */
const SECTION_ONE_LETTERS = ROWS.letter.filter(letter => letter.section === 1);

const {push, params} = vi.hoisted(() => ({push: vi.fn(), params: {number: '1'}}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
  useLocalSearchParams: () => params,
}));

describe('the Read section hub', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    params.number = '1';
    push.mockClear();
    useProgress.setState({progress: null});
  });

  it('shows the section name, its number and its track', async () => {
    // When
    renderScreen(<ReadSectionHub />);

    // Then
    expect(await screen.findByText('The four vowels')).toBeTruthy();
    expect(screen.getByText('Section 1 · Read')).toBeTruthy();
  });

  it('opens the first stop from the rail', async () => {
    // Given
    renderScreen(<ReadSectionHub />);
    const first = await screen.findByRole('button', {name: SECTION_ONE_STOPS[0]!.name});

    // When
    fireEvent.click(first);

    // Then
    expect(push).toHaveBeenCalledWith(`/stop/${SECTION_ONE_STOPS[0]!.id}`);
  });

  it('locks a later section while the walk has not reached it', async () => {
    // Given
    params.number = '6';

    // When
    renderScreen(<ReadSectionHub />);

    // Then
    const first = await screen.findByRole('button', {name: SECTION_SIX_STOPS[0]!.name});
    expect(first.getAttribute('aria-disabled')).toBe('true');
  });

  it('unlocks a later section once every stop before it is done', async () => {
    // Given
    params.number = '6';
    useProgress.setState({
      progress: {...EMPTY, completedStops: SECTION_ONE_STOPS.map(stop => stop.id)},
    });
    renderScreen(<ReadSectionHub />);
    const first = await screen.findByRole('button', {name: SECTION_SIX_STOPS[0]!.name});

    // When
    fireEvent.click(first);

    // Then
    expect(push).toHaveBeenCalledWith(`/stop/${SECTION_SIX_STOPS[0]!.id}`);
  });

  it('lists the letters the section teaches, with counts from the fixture', async () => {
    // Given
    renderScreen(<ReadSectionHub />);
    await screen.findByText('The four vowels');

    // When
    fireEvent.click(screen.getByRole('tab', {name: /Letters/}));

    // Then
    expect(
      await screen.findByText(`Section 1 · ${SECTION_ONE_LETTERS.length} letters · 0 met`),
    ).toBeTruthy();
    for (const letter of SECTION_ONE_LETTERS) {
      expect(screen.getByRole('button', {name: letter.letter_name ?? ''})).toBeTruthy();
    }
  });

  it('shows the honest empty state for a section that teaches no letters', async () => {
    // Given
    params.number = '6';
    renderScreen(<ReadSectionHub />);
    await screen.findByText('The three superscripts');

    // When
    fireEvent.click(screen.getByRole('tab', {name: /Letters/}));

    // Then
    expect(await screen.findByText('This section teaches no new letters')).toBeTruthy();
  });

  it('opens the script browser from the Reference segment', async () => {
    // Given
    renderScreen(<ReadSectionHub />);
    await screen.findByText('The four vowels');
    fireEvent.click(screen.getByRole('tab', {name: 'Reference'}));

    // When
    fireEvent.click(await screen.findByText('The script'));

    // Then
    expect(push).toHaveBeenCalledWith('/script');
  });
});
