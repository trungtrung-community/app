/**
 * @fileoverview B2 phrase sheet extension — the syllable transcript. Renders the
 * real route against the real fixture. Phases per docs/11.
 */

import {screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Phrase from '../../app/phrase/[id]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';

const {params} = vi.hoisted(() => ({params: {id: 'phrase.core.can-i-ask-you-something'}}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => params,
}));

describe('the phrase sheet', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    params.id = 'phrase.core.can-i-ask-you-something';
  });

  it('renders the transcript, syllable by syllable, for a phrase with chunks', async () => {
    // When
    renderScreen(<Phrase />);

    // Then — one syllable per chunk, each named by its own romanization.
    expect(await screen.findByTestId('phrase-transcript')).toBeTruthy();
    expect(screen.getByLabelText('shiik')).toBeTruthy();
    expect(screen.getByLabelText('drikkire')).toBeTruthy();
  });

  it('renders no transcript for a phrase with no chunks', async () => {
    // Given
    params.id = 'phrase.meeting.im-from';

    // When
    renderScreen(<Phrase />);

    // Then
    await screen.findByText(/Meeting People/);
    expect(screen.queryByTestId('phrase-transcript')).toBeNull();
  });
});
