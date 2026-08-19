/**
 * @fileoverview The settings screen's new rows (P2) and the tracks chooser
 * (K1's cards reused as a setting). The Wylie switch keeps its test in
 * you.test.tsx. Renders the real route screens against a settings-store double
 * through the container, with expo-router mocked at the module seam. Phases
 * per docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import SettingsScreen from '../../app/(tabs)/you/settings';
import Tracks from '../../app/(tabs)/you/tracks';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import {DEFAULT_SETTINGS, type Settings, type SettingsStore} from '../../src/ports/settings-store';

import {useSettings} from '../../src/store/settings';

const {push} = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
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
});

describe('the settings screen', () => {
  it('turns sound and vibration off together, through the one row', async () => {
    // Given
    renderScreen(<SettingsScreen />);
    const toggle = await screen.findByRole('switch', {
      name: 'Sound and vibration on a right answer',
    });
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    // When
    fireEvent.click(toggle);

    // Then
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    await flushMicrotasks();
    expect(useSettings.getState().settings).toEqual({
      ...DEFAULT_SETTINGS,
      sound: false,
      haptics: false,
    });
    expect(store.saved()).toEqual([{...DEFAULT_SETTINGS, sound: false, haptics: false}]);
  });

  it('turns audio-free practice on and persists it', async () => {
    // Given
    renderScreen(<SettingsScreen />);
    const toggle = await screen.findByRole('switch', {name: 'Practice without audio'});
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    // When
    fireEvent.click(toggle);

    // Then
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await flushMicrotasks();
    expect(useSettings.getState().settings).toEqual({...DEFAULT_SETTINGS, audioFree: true});
    expect(store.saved()).toEqual([{...DEFAULT_SETTINGS, audioFree: true}]);
  });

  it('shows Off on the nudge row while the reminder is off', async () => {
    // When
    renderScreen(<SettingsScreen />);

    // Then
    expect(screen.getByText('Off')).toBeTruthy();
  });

  it('shows the reminder time on the nudge row and opens the reminder screen', async () => {
    // Given
    useSettings.setState({
      settings: {...DEFAULT_SETTINGS, reminder: {enabled: true, hour: 19, minute: 0}},
    });
    renderScreen(<SettingsScreen />);
    expect(screen.getByText('19:00')).toBeTruthy();

    // When
    fireEvent.click(screen.getByRole('button', {name: /^A nudge once a day/}));

    // Then
    expect(push).toHaveBeenCalledWith('/you/reminders');
  });

  it('shows the current track on its row and opens the chooser', async () => {
    // Given
    renderScreen(<SettingsScreen />);
    expect(screen.getByText('Speak')).toBeTruthy();

    // When
    fireEvent.click(screen.getByRole('button', {name: /^Your tracks/}));

    // Then
    expect(push).toHaveBeenCalledWith('/you/tracks');
  });
});

describe('the tracks screen', () => {
  it('marks the track the learner is on', () => {
    // Given
    useSettings.setState({settings: {...DEFAULT_SETTINGS, track: 'read'}});

    // When
    renderScreen(<Tracks />);

    // Then
    const checked = (name: string) =>
      screen.getByRole('radio', {name}).getAttribute('aria-checked');
    expect(checked('Read the script')).toBe('true');
    expect(checked('Speak Tibetan')).toBe('false');
    expect(checked('Both')).toBe('false');
  });

  it('writes the tapped track with nothing to confirm', async () => {
    // Given
    renderScreen(<Tracks />);
    const read = await screen.findByRole('radio', {name: 'Read the script'});
    expect(read.getAttribute('aria-checked')).toBe('false');

    // When
    fireEvent.click(read);

    // Then
    expect(read.getAttribute('aria-checked')).toBe('true');
    await flushMicrotasks();
    expect(useSettings.getState().settings?.track).toBe('read');
    expect(store.saved()).toEqual([{...DEFAULT_SETTINGS, track: 'read'}]);
  });
});
