/**
 * @fileoverview V2 word sheet — the Tibetan, its romanization, the gloss, and where
 * the word meets you. Renders the real route against the real fixture. Phases per
 * docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Word from '../../app/word/[id]';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import type {ContentFixture} from '../../src/infra/content/rows.generated';

import {useSettings} from '../../src/store/settings';

const {push} = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({id: 'vocab.tashi-delek'}),
  useRouter: () => ({push}),
}));

describe('the word sheet', () => {
  beforeEach(() => {
    resetContainer();
    override('content', new JsonContentSource(fixture as unknown as ContentFixture));
    useSettings.setState({settings: null});
    push.mockClear();
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

  it('lists the phrases the word appears in, as tappable chips', async () => {
    // When
    renderScreen(<Word />);

    // Then
    expect(await screen.findByText('tra shi de lek')).toBeTruthy();
    expect(screen.getByText('tra shi de lek shuu')).toBeTruthy();
  });

  it('opens a phrase sheet from an "appears in" chip', async () => {
    // Given
    renderScreen(<Word />);
    const chip = await screen.findByRole('button', {name: 'tra shi de lek'});

    // When
    fireEvent.click(chip);

    // Then
    expect(push).toHaveBeenCalledWith('/phrase/phrase.core.greeting');
  });

  it('shows the Wylie spelling only when the setting is on', async () => {
    // Given
    useSettings.setState({settings: {wylie: false}});

    // When
    const {unmount} = renderScreen(<Word />);
    await screen.findByText('trashi delek');

    // Then
    expect(screen.queryByText('bkra shis bde legs')).toBeNull();

    // When
    unmount();
    useSettings.setState({settings: {wylie: true}});
    renderScreen(<Word />);

    // Then
    expect(await screen.findByText('bkra shis bde legs')).toBeTruthy();
  });
});
