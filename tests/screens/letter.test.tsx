/**
 * @fileoverview L2 letter sheet — one letter, its name and its place in the
 * script. Renders the real route against the real fixture. Phases per docs/11.
 */

import {screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import LetterSheet from '../../app/letter/[id]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import {lettersOf} from '../../src/domain/tibetan';

const ROWS = fixture as unknown as {
  stack: {id: string; grp: string; root: string | null; affix: string | null}[];
  affix: {id: string; type: string; may_follow_any_root: number | null}[];
  read_word: {id: string; bo: string; reading: string | null; section: number}[];
};

/** The stacks whose root is ཀ, split by role — what "what can attach" counts. */
const ON_KA = ROWS.stack.filter(stack => stack.root === 'ཀ');
const KA_PREFIXES = new Set(ON_KA.filter(s => s.grp === 'prefix').map(s => s.affix));
const KA_SUPERSCRIPTS = new Set(ON_KA.filter(s => s.grp === 'superscript').map(s => s.affix));
const KA_SUBSCRIPTS = new Set(ON_KA.filter(s => s.grp === 'subscript').map(s => s.affix));

/** The suffixes that may follow any root, from the affix inventory. */
const ANY_ROOT_SUFFIXES = ROWS.affix.filter(
  affix => affix.type === 'suffix' && affix.may_follow_any_root === 1,
);

/** The Read words written with ཀ, by the domain's own decomposition, in teaching order. */
const KA_WORDS = [...ROWS.read_word]
  .sort((a, b) => a.section - b.section || (a.id < b.id ? -1 : 1))
  .filter(word => lettersOf(word.bo).includes('ཀ'));

const {push, params} = vi.hoisted(() => ({push: vi.fn(), params: {id: 'letter.ka'}}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
  useLocalSearchParams: () => params,
}));

describe('the letter sheet', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    params.id = 'letter.ka';
    push.mockClear();
  });

  it('shows one of the thirty with its place in the grid', async () => {
    // When
    renderScreen(<LetterSheet />);

    // Then
    expect(await screen.findByText('ka')).toBeTruthy();
    expect(screen.getByText('row 1, unaspirated')).toBeTruthy();
  });

  it('shows a vowel with where its mark sits', async () => {
    // Given
    params.id = 'letter.gi-gu';

    // When
    renderScreen(<LetterSheet />);

    // Then
    expect(await screen.findByText('gi gu')).toBeTruthy();
    expect(screen.getByText('vowel mark · sits above')).toBeTruthy();
  });

  it('counts what can attach to a root from the stack and affix records', async () => {
    // When
    renderScreen(<LetterSheet />);

    // Then
    expect(await screen.findByText('What can attach')).toBeTruthy();
    expect(screen.getByText(`Prefixes · ${KA_PREFIXES.size}`)).toBeTruthy();
    expect(screen.getByText(`Superscripts · ${KA_SUPERSCRIPTS.size}`)).toBeTruthy();
    expect(screen.getByText(`Subscripts · ${KA_SUBSCRIPTS.size}`)).toBeTruthy();
    expect(screen.getByText(`Suffixes · all ${ANY_ROOT_SUFFIXES.length}`)).toBeTruthy();
  });

  it('lists the Read words the letter is written in', async () => {
    // Given
    const first = KA_WORDS[0];

    // When
    renderScreen(<LetterSheet />);

    // Then
    expect(await screen.findByText('Appears in')).toBeTruthy();
    expect(first).toBeDefined();
    expect(screen.getByText(first?.reading ?? '')).toBeTruthy();
  });

  it('keeps the attach block off a letter outside the thirty', async () => {
    // Given
    params.id = 'letter.gi-gu';

    // When
    renderScreen(<LetterSheet />);

    // Then
    await screen.findByText('gi gu');
    expect(screen.queryByText('What can attach')).toBeNull();
  });
});
