/**
 * @fileoverview S1's quiet restore line, in its own file.
 *
 * Separate from `onboarding.test.tsx` deliberately: that file's S1 block held
 * the line's absence until U3 landed, and the flow tests there move under
 * other hands. This one holds what the board draws under Start — the line for
 * a learner moving phones, opening U3 marked as an onboarding entry so the
 * finish can stamp `onboardedOn` and skip the steps.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Onboarding from '../../app/onboarding/index';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import {DEFAULT_SETTINGS, type SettingsStore} from '../../src/ports/settings-store';

import {useSettings} from '../../src/store/settings';

const {push} = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
}));

/** A settings store double; S1 only hydrates, so load is all it needs. */
const settingsStore: SettingsStore = {
  async load() {
    return DEFAULT_SETTINGS;
  },
  async save() {},
};

beforeEach(() => {
  resetContainer();
  override('settings', settingsStore);
  useSettings.setState({settings: null});
  push.mockClear();
});

describe('S1, the quiet restore line', () => {
  it('offers the learner moving phones a restore under Start', () => {
    // When
    renderScreen(<Onboarding />);

    // Then
    expect(screen.getByText('Moving from another phone?')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Restore a backup'})).toBeTruthy();
  });

  it('opens the restore screen marked as an onboarding entry', () => {
    // Given
    renderScreen(<Onboarding />);

    // When
    fireEvent.click(screen.getByRole('button', {name: 'Restore a backup'}));

    // Then
    expect(push).toHaveBeenCalledWith('/you/restore?from=onboarding');
  });
});
