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
import type {ItemId} from '../../src/domain/item';
import type {Progress} from '../../src/ports/progress-store';
import {useProgress} from '../../src/store/progress';
import {readableWords} from '../../src/usecases/read-progress';

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

const ROWS = fixture as unknown as {
  stop: {id: string; track: string; section_id: string; ordinal: number; name: string}[];
  letter: {id: string; letter_name: string | null; section: number}[];
  stack: {
    id: string;
    affix: string | null;
    reading: string | null;
    reads_also_as_json: string;
    section: number;
  }[];
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

/** Section 6's stacks — the superscripts — in the list's own order. */
const SECTION_SIX_STACKS = [...ROWS.stack]
  .filter(stack => stack.section === 6)
  .sort((a, b) => (a.id < b.id ? -1 : 1));

/** The ambiguous prefix pair the spec names: read as ba, and as aap. */
const ABA = ROWS.stack.find(stack => stack.id === 'stack.aba');
const ABA_ALSO = JSON.parse(ABA?.reads_also_as_json ?? '[]') as {reading: string}[];

/**
 * The fixture teaches no R-ROW anywhere, so the readable count would sit at
 * zero. One added rule-card on stop.1.1 makes word.ja (ཇ, rules R-ROW)
 * readable once letter.ja is met — the same seam the You tab's B4 test uses.
 */
const CROSSING_FIXTURE = {
  ...(fixture as unknown as ContentFixture),
  stop_position: [
    ...(fixture as unknown as ContentFixture).stop_position,
    {
      stop_id: 'stop.1.1',
      n: 20,
      kind: 'rule-card',
      screen: 'C1',
      item_id: null,
      exercise_id: null,
      rule_id: 'R-ROW',
      text: 'Same row, same sound family.',
      payload_json: '{}',
    },
  ],
} as unknown as ContentFixture;

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

  it('opens the combiner index and the cue ladder from the Reference segment', async () => {
    // Given
    renderScreen(<ReadSectionHub />);
    await screen.findByText('The four vowels');
    fireEvent.click(screen.getByRole('tab', {name: 'Reference'}));

    // When
    fireEvent.click(await screen.findByText('The seven that attach'));
    fireEvent.click(screen.getByText('Finding the root'));

    // Then
    expect(push).toHaveBeenCalledWith('/combiner');
    expect(push).toHaveBeenCalledWith('/cue-ladder');
  });

  it('lists the stacks the section teaches, count and breakdown from the fixture', async () => {
    // Given
    params.number = '6';
    const byAffix = new Map<string, number>();
    for (const stack of SECTION_SIX_STACKS) {
      byAffix.set(stack.affix ?? '', (byAffix.get(stack.affix ?? '') ?? 0) + 1);
    }
    renderScreen(<ReadSectionHub />);
    await screen.findByText('The three superscripts');

    // When
    fireEvent.click(screen.getByRole('tab', {name: /Stacks/}));

    // Then — the heading is the group's own name, and every count is the list's.
    expect(await screen.findByText('Superscripts')).toBeTruthy();
    const countLine = screen.getByText(/^Section 6 · \d+ stacks · /);
    expect(countLine.textContent).toContain(`${SECTION_SIX_STACKS.length} stacks`);
    const breakdown = countLine.textContent?.split(' · ')[2] ?? '';
    const stated = breakdown.split(' + ').map(Number);
    expect(stated.reduce((sum, n) => sum + n, 0)).toBe(SECTION_SIX_STACKS.length);
    expect(new Set(stated)).toEqual(new Set(byAffix.values()));
  });

  it('shows both readings on an ambiguous stack', async () => {
    // Given
    params.number = '3';
    const readings = [ABA?.reading, ...ABA_ALSO.map(also => also.reading)].join(' · ');
    renderScreen(<ReadSectionHub />);
    await screen.findByText('The five prefixes');

    // When
    fireEvent.click(screen.getByRole('tab', {name: /Stacks/}));

    // Then
    expect(await screen.findByText(readings)).toBeTruthy();
  });

  it('opens the stack sheet from a stack row', async () => {
    // Given
    params.number = '6';
    const first = SECTION_SIX_STACKS[0]!;
    renderScreen(<ReadSectionHub />);
    await screen.findByText('The three superscripts');
    fireEvent.click(screen.getByRole('tab', {name: /Stacks/}));
    const row = (await screen.findAllByRole('button', {name: first.reading ?? ''}))[0]!;

    // When
    fireEvent.click(row);

    // Then
    expect(push).toHaveBeenCalledWith(`/stack/${first.id}`);
  });

  it('keeps the exam door shut while the walk has not covered the section', async () => {
    // Given
    params.number = '5';

    // When
    renderScreen(<ReadSectionHub />);

    // Then
    await screen.findByText('The second suffixes');
    expect(screen.queryByText('Ready for the exam')).toBeNull();
  });

  it('opens the exam door once everything up to the exam section is walked', async () => {
    // Given — every stop before section 5, which in this fixture is section 1's.
    params.number = '5';
    useProgress.setState({
      progress: {...EMPTY, completedStops: SECTION_ONE_STOPS.map(stop => stop.id)},
    });
    renderScreen(<ReadSectionHub />);
    const door = await screen.findByText('Ready for the exam');

    // When
    fireEvent.click(door);

    // Then
    expect(push).toHaveBeenCalledWith('/exam/5');
  });

  it('opens the training ground from under the rail', async () => {
    // Given
    renderScreen(<ReadSectionHub />);
    const door = await screen.findByText('The training ground');

    // When
    fireEvent.click(door);

    // Then
    expect(push).toHaveBeenCalledWith('/training-ground');
  });

  it('keeps the readable-words block absent while no letter is met', async () => {
    // When
    renderScreen(<ReadSectionHub />);

    // Then
    await screen.findByText('The training ground');
    expect(screen.queryByText(/^Words you can now read/)).toBeNull();
  });

  it('binds the readable-words count to the crossing, never a stored number', async () => {
    // Given — the crossing fixture teaches R-ROW, ཇ's letter is met, and the
    // expected count is derived through the same use case the block binds.
    override('content', new JsonContentSource(CROSSING_FIXTURE));
    const progress: Progress = {
      ...EMPTY,
      completedStops: ['stop.1.1'],
      items: {
        ['letter.ja' as ItemId]: {
          itemId: 'letter.ja' as ItemId,
          state: 'met',
          correctOn: [],
          missedOn: [],
          intervalIndex: 0,
          dueOn: null,
        },
      },
    };
    useProgress.setState({progress});
    const source = new JsonContentSource(CROSSING_FIXTURE);
    const expected = await readableWords({walk: source, script: source, words: source}, progress);
    expect(expected.length).toBeGreaterThan(0);

    // When
    renderScreen(<ReadSectionHub />);

    // Then
    expect(await screen.findByText(`Words you can now read — ${expected.length}`)).toBeTruthy();
  });

  it('never shows the exam door on a section without an exam', async () => {
    // Given — the whole fixture walk done, on section 6.
    params.number = '6';
    useProgress.setState({
      progress: {
        ...EMPTY,
        completedStops: ROWS.stop.filter(stop => stop.track === 'read').map(stop => stop.id),
      },
    });

    // When
    renderScreen(<ReadSectionHub />);

    // Then
    await screen.findByText('The three superscripts');
    expect(screen.queryByText('Ready for the exam')).toBeNull();
  });
});
