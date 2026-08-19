/**
 * @fileoverview The onboarding flow (S1, K1, O2, O3, O4), walked linearly.
 *
 * Renders the real route screens with the settings store double through the
 * container and expo-router mocked at the module seam. The assertions are the
 * flow's product rules: three equal cards on K1, the smallest pace pre-selected
 * on O2, no play control on O3 while the build holds zero takes, 19:00
 * pre-selected on O4, and `onboardedOn` stamped by either O4 button.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import AudioPrimer from '../../app/onboarding/audio';
import Onboarding from '../../app/onboarding/index';
import PaceChoice from '../../app/onboarding/pace';
import Reminder from '../../app/onboarding/reminder';
import TrackChoice from '../../app/onboarding/track';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import {toIsoDate} from '../../src/domain/date';
import {DEFAULT_SETTINGS, type Settings, type SettingsStore} from '../../src/ports/settings-store';

import {useSettings} from '../../src/store/settings';

const {push, replace} = vi.hoisted(() => ({push: vi.fn(), replace: vi.fn()}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push, replace}),
}));

/** Drains pending promise chains without a real timer. */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i += 1) {
    await Promise.resolve();
  }
}

/** A settings store double that records saves, so write-through is assertable. */
function fakeSettingsStore(initial: Settings): SettingsStore & {saved: () => Settings[]} {
  const saves: Settings[] = [];
  return {
    async load() {
      return initial;
    },
    async save(next) {
      saves.push(next);
    },
    saved: () => saves,
  };
}

let store: ReturnType<typeof fakeSettingsStore>;

beforeEach(() => {
  resetContainer();
  store = fakeSettingsStore(DEFAULT_SETTINGS);
  override('settings', store);
  useSettings.setState({settings: null});
  push.mockClear();
  replace.mockClear();
});

describe('S1, the first screen', () => {
  it('starts the flow at the track choice', () => {
    // Given
    renderScreen(<Onboarding />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Start'}));

    // Then
    expect(push).toHaveBeenCalledWith('/onboarding/track');
  });

  it('holds the restore line back until U3 lands', () => {
    // When
    renderScreen(<Onboarding />);

    // Then
    expect(screen.queryByText(/Restore a backup/)).toBeNull();
  });
});

describe('K1, the track choice', () => {
  it('offers exactly three cards, none pre-picked', () => {
    // When
    renderScreen(<TrackChoice />);

    // Then
    const cards = screen.getAllByRole('radio');
    expect(cards.length).toBe(3);
    for (const card of cards) {
      expect(card.getAttribute('aria-checked')).toBe('false');
    }
  });

  it('keeps Carry on dead until a card is picked', () => {
    // Given
    renderScreen(<TrackChoice />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Carry on'}));

    // Then
    expect(push).not.toHaveBeenCalled();
  });

  it('writes the picked track and carries on to the pace', async () => {
    // Given
    renderScreen(<TrackChoice />);
    fireEvent.click(screen.getByRole('radio', {name: /Read the script/}));

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Carry on'}));
    await flushMicrotasks();

    // Then
    expect(store.saved().at(-1)?.track).toBe('read');
    expect(push).toHaveBeenCalledWith('/onboarding/pace');
  });
});

describe('O2, the pace', () => {
  it('draws the four board options in order, the smallest pre-selected', () => {
    // When
    renderScreen(<PaceChoice />);

    // Then
    const options = screen.getAllByRole('radio');
    expect(options.map(option => option.getAttribute('aria-label'))).toEqual([
      'A few minutes',
      'About ten minutes',
      'Twenty minutes',
      'As much as I can',
    ]);
    expect(options[0]?.getAttribute('aria-checked')).toBe('true');
  });

  it('writes the pace and carries on to the primer', async () => {
    // Given
    renderScreen(<PaceChoice />);
    fireEvent.click(screen.getByRole('radio', {name: 'About ten minutes'}));

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Carry on'}));
    await flushMicrotasks();

    // Then
    expect(store.saved().at(-1)?.pace).toBe('p10');
    expect(push).toHaveBeenCalledWith('/onboarding/audio');
  });
});

describe('O3, the audio primer', () => {
  it('carries the moment with no play control while the build holds zero takes', () => {
    // When
    renderScreen(<AudioPrimer />);

    // Then
    expect(screen.getByText('Every word is recorded by a person.')).toBeTruthy();
    expect(screen.getAllByRole('button')).toEqual([screen.getByRole('button', {name: 'Continue'})]);
  });

  it('continues to the reminder', () => {
    // Given
    renderScreen(<AudioPrimer />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Continue'}));

    // Then
    expect(push).toHaveBeenCalledWith('/onboarding/reminder');
  });
});

describe('O4, the reminder', () => {
  it('pre-selects 19:00', () => {
    // When
    renderScreen(<Reminder />);

    // Then
    expect(screen.getByRole('combobox').getAttribute('aria-valuetext')).toBe('19:00');
  });

  it('accepting writes the reminder, stamps the day and lands on the journey', async () => {
    // Given
    renderScreen(<Reminder />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Yes, remind me'}));
    await flushMicrotasks();

    // Then
    const saved = store.saved().at(-1);
    expect(saved?.reminder).toEqual({enabled: true, hour: 19, minute: 0});
    expect(saved?.onboardedOn).toBe(toIsoDate(new Date()));
    expect(replace).toHaveBeenCalledWith('/journey');
  });

  it('declining leaves the reminder off but still stamps the day', async () => {
    // Given
    renderScreen(<Reminder />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'No thanks'}));
    await flushMicrotasks();

    // Then
    const saved = store.saved().at(-1);
    expect(saved?.reminder.enabled).toBe(false);
    expect(saved?.onboardedOn).toBe(toIsoDate(new Date()));
    expect(replace).toHaveBeenCalledWith('/journey');
  });
});
