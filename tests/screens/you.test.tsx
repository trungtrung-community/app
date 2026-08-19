/**
 * @fileoverview The You tab (P1, Y1, Y2, Y6, P8) and settings (P2). Renders the
 * real route screens against the real fixture and store doubles through the
 * container, with expo-router mocked at the module seam. Phases per docs/11.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import About from '../../app/(tabs)/you/about';
import YourData from '../../app/(tabs)/you/data';
import Districts from '../../app/(tabs)/you/districts';
import You from '../../app/(tabs)/you/index';
import SettingsScreen from '../../app/(tabs)/you/settings';
import Stats from '../../app/(tabs)/you/stats';
import {renderScreen} from './render';
import {override, resetContainer} from '../../src/composition/container';
import fixture from '../../src/infra/content/content.fixture.json';
import {JsonContentSource} from '../../src/infra/content/json-content-source';
import {markTaught, newItem, type ItemId} from '../../src/domain/item';
import type {ContentFixture} from '../../src/infra/content/rows.generated';
import type {Progress, ProgressStore} from '../../src/ports/progress-store';
import type {Settings, SettingsStore} from '../../src/ports/settings-store';

import {useProgress} from '../../src/store/progress';
import {useSettings} from '../../src/store/settings';

const {push} = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};
const DEFAULT_SETTINGS: Settings = {wylie: false};

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

/** A progress store double with real export/clear behaviour over an in-memory record. */
function fakeProgressStore(initial: Progress): ProgressStore {
  let stored = initial;
  return {
    async load() {
      return stored;
    },
    async save(next) {
      stored = next;
    },
    async export() {
      return JSON.stringify(stored, null, 2);
    },
    async clear() {
      stored = EMPTY;
    },
  };
}

beforeEach(() => {
  resetContainer();
  override('content', new JsonContentSource(fixture as unknown as ContentFixture));
  override('settings', fakeSettingsStore(DEFAULT_SETTINGS));
  useProgress.setState({progress: null});
  useSettings.setState({settings: null});
  push.mockClear();
});

describe('the you hub', () => {
  it('renders a row to each destination', () => {
    // When
    renderScreen(<You />);

    // Then
    expect(screen.getByText('Stats')).toBeTruthy();
    expect(screen.getByText('District progress')).toBeTruthy();
    expect(screen.getByText('Search')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Your data')).toBeTruthy();
    expect(screen.getByText('About')).toBeTruthy();
  });

  it('shows the days walked, from the progress snapshot', () => {
    // Given
    useProgress.setState({progress: {...EMPTY, walkedOn: ['2026-08-17', '2026-08-18']}});

    // When
    renderScreen(<You />);

    // Then
    expect(screen.getByText('Days walking · 2')).toBeTruthy();
  });

  it('pushes to a destination when a row is pressed', () => {
    // Given — a ListRow's accessible name is its label followed by its sub text
    renderScreen(<You />);

    // When
    fireEvent.click(screen.getByRole('button', {name: /^Settings/}));

    // Then
    expect(push).toHaveBeenCalledWith('/you/settings');
  });
});

describe('the settings screen', () => {
  it('flips the wylie switch and persists the change', async () => {
    // Given — run before any Dialog-based test in this file: Switch's own settle
    // animation and Dialog's entering animation both run as deferred Reanimated
    // frames that jsdom's clock does not fully drain between tests, so a Switch
    // toggle placed after a Dialog test is more likely to catch a stray one.
    const store = fakeSettingsStore(DEFAULT_SETTINGS);
    override('settings', store);
    renderScreen(<SettingsScreen />);
    const toggle = await screen.findByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    // When
    fireEvent.click(toggle);

    // Then — the switch reads back immediately; the save is a promise chain with
    // no real timers in it, so a handful of microtask flushes clears it.
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await flushMicrotasks();
    expect(store.saved()).toEqual([{wylie: true}]);
  });
});

describe('the stats screen', () => {
  it('renders zeros from a null snapshot', () => {
    // When
    renderScreen(<Stats />);

    // Then — words known, words met, days walking, stops completed
    expect(screen.getAllByText('0').length).toBe(4);
  });

  it('counts taught items from the snapshot', () => {
    // Given
    const met = 'vocab.tashi-delek' as ItemId;
    const progress: Progress = {
      walkedOn: ['2026-08-17'],
      items: {[met]: markTaught(newItem(met))},
      completedStops: ['stop.core.c1.1'],
      version: 2,
    };
    useProgress.setState({progress});

    // When
    renderScreen(<Stats />);

    // Then — one word met, one day walked, one stop completed
    expect(screen.getAllByText('1').length).toBe(3);
    expect(screen.getByText('0')).toBeTruthy();
  });
});

describe('the district progress screen', () => {
  it('shows a row per district, with met counts from the snapshot', async () => {
    // Given — the word's home district is core, "First Words"
    const met = 'vocab.tashi-delek' as ItemId;
    useProgress.setState({
      progress: {
        walkedOn: [],
        items: {[met]: markTaught(newItem(met))},
        completedStops: [],
        version: 2,
      },
    });

    // When
    renderScreen(<Districts />);

    // Then
    expect(await screen.findByText('First Words')).toBeTruthy();
    expect(screen.getByText(/^1 of \d+ words met$/)).toBeTruthy();
  });
});

describe('the your data screen', () => {
  beforeEach(() => {
    override('progress', fakeProgressStore({...EMPTY, walkedOn: ['2026-08-17']}));
  });

  it('makes a backup on request', async () => {
    // Given
    renderScreen(<YourData />);

    // When
    fireEvent.click(screen.getByRole('button', {name: /^Make a backup/}));

    // Then
    expect(await screen.findByText(/ready/)).toBeTruthy();
  });

  it('clears progress after the dialog is confirmed', async () => {
    // Given — the confirm footer sits inside Dialog's entering animation, whose
    // CSS keyframes jsdom never runs, so its subtree stays computed-hidden and
    // is found by text rather than by accessible role name.
    renderScreen(<YourData />);
    fireEvent.click(screen.getByRole('button', {name: /^Clear progress/}));

    // When
    fireEvent.click(await screen.findByText('Clear'));
    await flushMicrotasks();

    // Then
    expect(useProgress.getState().progress).toEqual(EMPTY);
  });
});

describe('the about screen', () => {
  it('names the content version', async () => {
    // When
    renderScreen(<About />);

    // Then
    expect(await screen.findByText(new RegExp(fixture.content_version))).toBeTruthy();
  });
});
