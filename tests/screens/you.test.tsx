/**
 * @fileoverview The You tab (P1, Y1, Y2, P8) and settings (P2). Renders the
 * real route screens against the real fixture and store doubles through the
 * container, with expo-router mocked at the module seam. Phases per docs/11.
 * The your-data screen's tests live in `data.test.tsx` since it became U1.
 */

import {fireEvent, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';

import About from '../../app/(tabs)/you/about';
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
import type {Progress} from '../../src/ports/progress-store';
import {DEFAULT_SETTINGS, type Settings, type SettingsStore} from '../../src/ports/settings-store';

import {useProgress} from '../../src/store/progress';
import {useSettings} from '../../src/store/settings';

const {push} = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('expo-router', () => ({
  useRouter: () => ({push}),
}));

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

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
    const toggle = await screen.findByRole('switch', {name: 'Spelled out (Wylie)'});
    expect(toggle.getAttribute('aria-checked')).toBe('false');

    // When
    fireEvent.click(toggle);

    // Then — the switch reads back immediately; the save is a promise chain with
    // no real timers in it, so a handful of microtask flushes clears it.
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await flushMicrotasks();
    expect(store.saved()).toEqual([{...DEFAULT_SETTINGS, wylie: true}]);
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

describe('the about screen', () => {
  it('names the content version', async () => {
    // When
    renderScreen(<About />);

    // Then
    expect(await screen.findByText(new RegExp(fixture.content_version))).toBeTruthy();
  });
});

/**
 * The fixture teaches no R-ROW anywhere, so B4's readable count would sit at
 * zero. One added rule-card on stop.1.1 makes word.ja (ཇ, rules R-ROW) readable
 * once letter.ja is met — the numbers below are derived, never typed here first.
 */
const CROSSING_FIXTURE = {
  ...(fixture as unknown as ContentFixture),
  stop_position: [
    ...(fixture as unknown as ContentFixture).stop_position,
    {
      stop_id: 'stop.1.1',
      n: 20,
      kind: 'rule-card',
      screen: 'C1',
      item_id: null,
      exercise_id: null,
      rule_id: 'R-ROW',
      text: 'Same row, same sound family.',
      payload_json: '{}',
    },
  ],
} as unknown as ContentFixture;

describe('the combined-progress block (B4)', () => {
  it('is absent entirely while the Read track is untouched', async () => {
    // Given
    useProgress.setState({progress: {...EMPTY, completedStops: ['stop.core.c1.1']}});

    // When
    renderScreen(<You />);
    await flushMicrotasks();

    // Then
    expect(screen.queryByText('The walk')).toBeNull();
  });

  it('draws the two bands and the crossing, every number computed', async () => {
    // Given — one speak stop done, the Read rule stop done, one letter met, and
    // the letter's word already said (vocab.tea, home district teahouse)
    override('content', new JsonContentSource(CROSSING_FIXTURE));
    useProgress.setState({
      progress: {
        walkedOn: [],
        items: {
          ['letter.ja' as ItemId]: markTaught(newItem('letter.ja' as ItemId)),
          ['vocab.tea' as ItemId]: markTaught(newItem('vocab.tea' as ItemId)),
        },
        completedStops: ['stop.core.c1.1', 'stop.1.1'],
        version: 2,
      },
    });

    // When
    renderScreen(<You />);

    // Then — 1 of 20 speak stops, 1 of 55 letters, one crossed district
    expect(await screen.findByText('The walk')).toBeTruthy();
    expect(screen.getByText('Speak')).toBeTruthy();
    expect(screen.getByText('1/20')).toBeTruthy();
    expect(screen.getByText('Read')).toBeTruthy();
    expect(screen.getByText('1/55')).toBeTruthy();
    expect(screen.getByText('1 district sits under both bands.')).toBeTruthy();
  });

  it('binds the readable count and opens the journey from it', async () => {
    // Given
    override('content', new JsonContentSource(CROSSING_FIXTURE));
    useProgress.setState({
      progress: {
        walkedOn: [],
        items: {['letter.ja' as ItemId]: markTaught(newItem('letter.ja' as ItemId))},
        completedStops: ['stop.1.1'],
        version: 2,
      },
    });
    renderScreen(<You />);
    const read = await screen.findByRole('button', {name: 'Read the 1'});

    // When
    fireEvent.click(read);

    // Then
    expect(push).toHaveBeenCalledWith('/journey');
  });
});
