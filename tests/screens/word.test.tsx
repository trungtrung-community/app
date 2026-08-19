/**
 * @fileoverview V2 word sheet — the Tibetan, its romanization, the gloss, and where
 * the word meets you. Renders the real route against the real fixture. Phases per
 * docs/11.
 */

import {screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Word from '../../app/word/[id]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';

vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({id: 'vocab.tashi-delek'}),
}));

describe('the word sheet', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
  });

  it('shows the word whole: Tibetan, romanization, gloss', async () => {
    // When
    renderScreen(<Word />);

    // Then — the script's accessible name is the romanization, per TibetanText.
    expect(await screen.findByText('trashi delek')).toBeTruthy();
    expect(screen.getByLabelText('trashi delek')).toBeTruthy();
    expect(screen.getByText('hello / greetings')).toBeTruthy();
  });

  it('names the district the word meets you in', async () => {
    // When
    renderScreen(<Word />);

    // Then
    expect(await screen.findByText(/First Words/)).toBeTruthy();
  });
});
