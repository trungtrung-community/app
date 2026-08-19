/**
 * @fileoverview The reminder settings screen (N3): the switch and the time each
 * write the setting and re-sync the schedule in the same gesture, and the
 * switch's on position is the one that asks for permission. Renders the real
 * route screen against a settings-store double through the container, with the
 * notification seam faked at the module boundary. Phases per docs/11.
 */

import {fireEvent, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Reminders from '../../app/(tabs)/you/reminders';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import {DEFAULT_SETTINGS, type Settings, type SettingsStore} from '../../src/ports/settings-store';

import {useSettings} from '../../src/store/settings';

const {requestReminderPermission, syncReminders} = vi.hoisted(() => ({
  requestReminderPermission: vi.fn(async () => 'granted' as const),
  syncReminders: vi.fn(async () => {}),
}));
vi.mock('../../src/composition/notifications', () => ({requestReminderPermission, syncReminders}));

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
  requestReminderPermission.mockClear();
  syncReminders.mockClear();
});

describe('the reminders screen', () => {
  it('turning the switch on asks permission, persists it, and re-syncs the schedule', async () => {
    // Given
    renderScreen(<Reminders />);
    const toggle = await screen.findByRole('switch', {name: 'Remind me'});
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    // When
    fireEvent.click(toggle);

    // Then — the sync waits on the write, so it is awaited rather than counted
    await waitFor(() => expect(syncReminders).toHaveBeenCalledTimes(1));
    expect(requestReminderPermission).toHaveBeenCalledTimes(1);
    expect(store.saved().at(-1)?.reminder).toEqual({enabled: true, hour: 19, minute: 0});
  });

  it('turning the switch off keeps the time and re-syncs without asking again', async () => {
    // Given
    useSettings.setState({
      settings: {...DEFAULT_SETTINGS, reminder: {enabled: true, hour: 8, minute: 0}},
    });
    renderScreen(<Reminders />);

    // When
    fireEvent.click(screen.getByRole('switch', {name: 'Remind me'}));

    // Then
    await waitFor(() => expect(syncReminders).toHaveBeenCalledTimes(1));
    expect(requestReminderPermission).not.toHaveBeenCalled();
    expect(store.saved().at(-1)?.reminder).toEqual({enabled: false, hour: 8, minute: 0});
  });

  it('shows the stored time on the select', () => {
    // Given
    useSettings.setState({
      settings: {...DEFAULT_SETTINGS, reminder: {enabled: true, hour: 21, minute: 30}},
    });

    // When
    renderScreen(<Reminders />);

    // Then
    expect(screen.getByRole('combobox').getAttribute('aria-valuetext')).toBe('21:30');
  });

  it('picking a time writes it and re-syncs the schedule', async () => {
    // Given
    renderScreen(<Reminders />);
    fireEvent.click(screen.getByRole('combobox'));

    // When — by text: the sheet's options sit behind the entrance animation,
    // which jsdom never runs, so role queries still see them as hidden.
    fireEvent.click(await screen.findByText('08:00'));

    // Then
    await waitFor(() => expect(syncReminders).toHaveBeenCalledTimes(1));
    expect(store.saved().at(-1)?.reminder).toEqual({enabled: false, hour: 8, minute: 0});
  });
});
