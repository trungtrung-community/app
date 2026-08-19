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
});
