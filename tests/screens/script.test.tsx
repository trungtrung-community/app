/**
 * @fileoverview L1 script browser — the thirty in grid order, the vowels, and
 * the met filter. Renders the real route against the real fixture. Phases per
 * docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Script from '../../app/script/index';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {ItemId} from '../../src/domain/item';
import type {Progress} from '../../src/ports/progress-store';
import {useProgress} from '../../src/store/progress';

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

const LETTERS = (
  fixture as unknown as {
    letter: {
      id: string;
      subtype: string;
      letter_name: string | null;
      row: number | null;
      col: number | null;
      mark_cp: string | null;
    }[];
  }
).letter;

/** The thirty, in the grid order the screen binds to: row, then column. */
const THIRTY = LETTERS.filter(letter => letter.subtype === 'consonant').sort(
  (a, b) => (a.row ?? 0) - (b.row ?? 0) || (a.col ?? 0) - (b.col ?? 0),
);

/** The four marks, in the mark's own codepoint order. */
const VOWELS = LETTERS.filter(letter => letter.subtype === 'vowel').sort((a, b) =>
  (a.mark_cp ?? '').localeCompare(b.mark_cp ?? ''),
);

const {push} = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
}));

describe('the script browser', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    push.mockClear();
    useProgress.setState({progress: null});
  });

  it('draws the thirty in grid order, then the vowels', async () => {
    // When
    renderScreen(<Script />);

    // Then
    await screen.findByRole('button', {name: THIRTY[0]!.letter_name ?? ''});
    const letterNames = new Set(
      [...THIRTY, ...VOWELS].map(letter => letter.letter_name).filter(name => name !== null),
    );
    const drawn = screen
      .getAllByRole('button')
      .map(node => node.getAttribute('aria-label'))
      .filter(name => name !== null && letterNames.has(name));
    expect(drawn).toEqual([...THIRTY, ...VOWELS].map(letter => letter.letter_name));
  });

  it('binds the All tag to the fixture count', async () => {
    // When
    renderScreen(<Script />);

    // Then
    expect(await screen.findByText(`All ${THIRTY.length}`)).toBeTruthy();
  });

  it('opens the letter sheet from a tile', async () => {
    // Given
    renderScreen(<Script />);
    const tile = await screen.findByRole('button', {name: THIRTY[0]!.letter_name ?? ''});

    // When
    fireEvent.click(tile);

    // Then
    expect(push).toHaveBeenCalledWith(`/letter/${THIRTY[0]!.id}`);
  });

  it('narrows to met letters with the filter', async () => {
    // Given
    const met = THIRTY[0]!;
    useProgress.setState({
      progress: {
        ...EMPTY,
        items: {
          [met.id]: {
            itemId: met.id as ItemId,
            state: 'met',
            correctOn: [],
            missedOn: [],
            intervalIndex: 0,
            dueOn: null,
          },
        },
      },
    });
    renderScreen(<Script />);
    await screen.findByRole('button', {name: met.letter_name ?? ''});

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Met'}));

    // Then
    expect(screen.getByRole('button', {name: met.letter_name ?? ''})).toBeTruthy();
    expect(screen.queryByRole('button', {name: THIRTY[1]!.letter_name ?? ''})).toBeNull();
  });
});
