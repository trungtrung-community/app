/**
 * @fileoverview The launch gate — one launch, one of three doors.
 *
 * Renders the real entry route with the three stores doubled through the
 * container and expo-router's `Redirect` mocked to a visible marker. The
 * assertions are the docs/02 precedence: a fresh install onboards, a return
 * within three days goes straight to the journey, three or more days away or a
 * parked stop goes through O5 — and O5 at most once per launch.
 */

import {screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import Home, {resetLaunchGate} from '../../app/index';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import {addDays, toIsoDate} from '../../src/domain/date';
import {DEFAULT_APP_STATE, type AppState} from '../../src/ports/app-state-store';
import type {Progress} from '../../src/ports/progress-store';
import {DEFAULT_SETTINGS, type Settings} from '../../src/ports/settings-store';
import {useProgress} from '../../src/store/progress';
import {useSettings} from '../../src/store/settings';

vi.mock('expo-router', () => ({
  Redirect: ({href}: {href: string}) => <span data-testid="redirect">{href}</span>,
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

const TODAY = toIsoDate(new Date());

/** A parked stop snapshot, mid-flight at the fixture's first core stop. */
const PARKED: AppState = {
  ...DEFAULT_APP_STATE,
  session: {
    stopId: 'stop.core.c1.1',
    contentVersion: '1',
    savedAt: new Date().toISOString(),
    state: {},
  },
};

/** Wire all three stores; `appState: 'corrupt'` makes its load reject. */
function wireStores(input: {
  settings?: Partial<Settings>;
  progress?: Partial<Progress>;
  appState?: AppState | 'corrupt';
}): void {
  override('settings', {
    load: async () => ({...DEFAULT_SETTINGS, ...input.settings}),
    save: async () => {},
  });
  override('progress', {
    load: async () => ({...EMPTY, ...input.progress}),
    save: async () => {},
    export: async () => '',
    clear: async () => {},
  });
  override('appState', {
    load: async () => {
      if (input.appState === 'corrupt') {
        throw new Error('corrupt bookkeeping');
      }
      return input.appState ?? DEFAULT_APP_STATE;
    },
    save: async () => {},
  });
}

async function redirectedTo(): Promise<string> {
  const marker = await screen.findByTestId('redirect');
  return marker.textContent ?? '';
}

beforeEach(() => {
  resetContainer();
  resetLaunchGate();
  useSettings.setState({settings: null});
  useProgress.setState({progress: null});
});

describe('the launch gate', () => {
  it('sends a fresh install to onboarding', async () => {
    // Given
    wireStores({});

    // When
    renderScreen(<Home />);

    // Then
    expect(await redirectedTo()).toBe('/onboarding');
  });

  it('sends an onboarded learner who walked today straight to the journey', async () => {
    // Given
    wireStores({settings: {onboardedOn: TODAY}, progress: {walkedOn: [TODAY]}});

    // When
    renderScreen(<Home />);

    // Then
    expect(await redirectedTo()).toBe('/journey');
  });

  it('welcomes a learner back after three or more days away', async () => {
    // Given
    wireStores({settings: {onboardedOn: TODAY}, progress: {walkedOn: [addDays(TODAY, -4)]}});

    // When
    renderScreen(<Home />);

    // Then
    expect(await redirectedTo()).toBe('/welcome-back');
  });

  it('welcomes a learner back for a parked stop, even having walked today', async () => {
    // Given
    wireStores({
      settings: {onboardedOn: TODAY},
      progress: {walkedOn: [TODAY]},
      appState: PARKED,
    });

    // When
    renderScreen(<Home />);

    // Then
    expect(await redirectedTo()).toBe('/welcome-back');
  });

  it('reads corrupt bookkeeping as nothing parked and goes to the journey', async () => {
    // Given
    wireStores({
      settings: {onboardedOn: TODAY},
      progress: {walkedOn: [TODAY]},
      appState: 'corrupt',
    });

    // When
    renderScreen(<Home />);

    // Then
    expect(await redirectedTo()).toBe('/journey');
  });

  it('shows the welcome at most once per launch', async () => {
    // Given
    wireStores({settings: {onboardedOn: TODAY}, progress: {walkedOn: [addDays(TODAY, -4)]}});
    const first = renderScreen(<Home />);
    expect(await redirectedTo()).toBe('/welcome-back');
    first.unmount();

    // When
    renderScreen(<Home />);

    // Then
    expect(await redirectedTo()).toBe('/journey');
  });
});
