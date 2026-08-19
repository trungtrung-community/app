/**
 * @fileoverview B1 journey map — the Speak/Read switch and the district rail.
 *
 * Renders the real route screen against the real fixture through the container,
 * with expo-router mocked at the module seam. Phases per docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Journey, {EXAM_SECTIONS, pairTwoDoors} from '../../app/(tabs)/journey/index';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {District} from '../../src/ports/content-model';
import type {DistrictId, SectionId} from '../../src/ports/content-ids';
import type {Progress} from '../../src/ports/progress-store';
import {useProgress} from '../../src/store/progress';

const {push} = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

/** Every stop of district `core`, straight from the fixture. */
const CORE_STOPS = (fixture as unknown as {stop: {id: string; district_id: string | null}[]}).stop
  .filter(stop => stop.district_id === 'district.core')
  .map(stop => stop.id);

const ROWS = fixture as unknown as {
  section: {id: string; track: string; number: number; name: string}[];
  stop: {id: string; track: string; section_id: string; ordinal: number; name: string}[];
};

const READ_SECTIONS = ROWS.section.filter(section => section.track === 'read');

/** The Read walk in walking order — section number, then ordinal — from the fixture. */
const READ_WALK = ROWS.stop
  .filter(stop => stop.track === 'read')
  .sort((a, b) => {
    const bySection =
      (READ_SECTIONS.find(s => s.id === a.section_id)?.number ?? 0) -
      (READ_SECTIONS.find(s => s.id === b.section_id)?.number ?? 0);
    return bySection || a.ordinal - b.ordinal;
  });

/** A hand-made district, for the pairing unit tests below. */
function makeDistrict(partial: Pick<District, 'slug' | 'number' | 'name'>): District {
  return {
    id: `district.${partial.slug}` as DistrictId,
    sectionId: 'section.speak.4' as SectionId,
    ...partial,
  };
}

describe('the journey map', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    push.mockClear();
    useProgress.setState({progress: null});
  });

  it('opens the next district once the one before is finished', async () => {
    // Given — every stop of district 1 done
    useProgress.setState({progress: {...EMPTY, completedStops: CORE_STOPS}});
    renderScreen(<Journey />);
    const next = await screen.findByRole('button', {name: 'Meeting People'});

    // When
    fireEvent.click(next);

    // Then
    expect(push).toHaveBeenCalledWith('/journey/district/meeting');
    expect(next.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('renders Speak sections and districts from the fixture', async () => {
    // When
    renderScreen(<Journey />);

    // Then
    expect(await screen.findByText('Into Town')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'First Words'})).toBeTruthy();
  });

  it('switches from Speak to Read with the segmented control', async () => {
    // Given
    renderScreen(<Journey />);
    await screen.findByText('Into Town');

    // When
    fireEvent.click(screen.getByRole('tab', {name: 'Read'}));

    // Then
    expect(await screen.findByRole('heading', {name: 'The four vowels'})).toBeTruthy();
  });

  it('opens district 1 and leaves a later district locked', async () => {
    // Given
    renderScreen(<Journey />);
    const first = await screen.findByRole('button', {name: 'First Words'});
    const later = screen.getByRole('button', {name: 'Meeting People'});

    // When
    fireEvent.click(first);

    // Then
    expect(push).toHaveBeenCalledWith('/journey/district/core');
    expect(later.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('the Read map', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    push.mockClear();
    useProgress.setState({progress: null});
  });

  /** Renders the journey and switches to the Read segment. */
  async function openRead(): Promise<void> {
    renderScreen(<Journey />);
    await screen.findByText('Into Town');
    fireEvent.click(screen.getByRole('tab', {name: 'Read'}));
  }

  it('binds the header counts to the fixture', async () => {
    // Given
    await openRead();

    // Then
    expect(
      await screen.findByText(
        `${READ_SECTIONS.length} sections · ${READ_WALK.length} stops · ${EXAM_SECTIONS.length} exams`,
      ),
    ).toBeTruthy();
  });

  it('opens the first stop and locks the one after it', async () => {
    // Given
    await openRead();
    const first = await screen.findByRole('button', {name: READ_WALK[0]!.name});
    const later = screen.getByRole('button', {name: READ_WALK[1]!.name});

    // When
    fireEvent.click(first);

    // Then
    expect(push).toHaveBeenCalledWith(`/stop/${READ_WALK[0]!.id}`);
    expect(later.getAttribute('aria-disabled')).toBe('true');
  });

  it('unlocks a stop once its predecessor is done', async () => {
    // Given
    useProgress.setState({progress: {...EMPTY, completedStops: [READ_WALK[0]!.id]}});
    await openRead();
    const next = await screen.findByRole('button', {name: READ_WALK[1]!.name});
    const after = screen.getByRole('button', {name: READ_WALK[2]!.name});

    // When
    fireEvent.click(next);

    // Then
    expect(push).toHaveBeenCalledWith(`/stop/${READ_WALK[1]!.id}`);
    expect(after.getAttribute('aria-disabled')).toBe('true');
  });

  it('draws the two exam waymarks locked and doorless', async () => {
    // Given
    await openRead();
    await screen.findByRole('button', {name: READ_WALK[0]!.name});

    // Then
    expect(screen.getByRole('button', {name: 'First exam'}).getAttribute('aria-disabled')).toBe(
      'true',
    );
    const finals = screen.getAllByRole('button', {name: 'The final test'});
    expect(finals.some(node => node.getAttribute('aria-disabled') === 'true')).toBe(true);
  });

  it('opens the section hub from a section header', async () => {
    // Given
    await openRead();
    const header = await screen.findByRole('button', {name: 'The four vowels'});

    // When
    fireEvent.click(header);

    // Then
    expect(push).toHaveBeenCalledWith('/journey/section/1');
  });
});

describe('pairing the two-door districts', () => {
  it('merges medicine and astrology into one entry', () => {
    // Given
    const districts = [
      makeDistrict({slug: 'kitchen', number: 11, name: 'The Kitchen'}),
      makeDistrict({slug: 'medicine', number: 15, name: 'The Medicine Room'}),
      makeDistrict({slug: 'astrology', number: 16, name: 'The Astrology Room'}),
    ];

    // When
    const entries = pairTwoDoors(districts);

    // Then
    expect(entries).toEqual([
      {kind: 'district', district: districts[0]},
      {kind: 'twoDoor', first: districts[1], second: districts[2]},
    ]);
  });

  it('leaves a lone half of the pair as its own district', () => {
    // Given
    const districts = [makeDistrict({slug: 'medicine', number: 15, name: 'The Medicine Room'})];

    // When
    const entries = pairTwoDoors(districts);

    // Then
    expect(entries).toEqual([{kind: 'district', district: districts[0]}]);
  });

  it('does not fire when neither half of a pair is present', () => {
    // Given
    const districts = [makeDistrict({slug: 'kitchen', number: 11, name: 'The Kitchen'})];

    // When
    const entries = pairTwoDoors(districts);

    // Then
    expect(entries).toEqual([{kind: 'district', district: districts[0]}]);
  });
});
