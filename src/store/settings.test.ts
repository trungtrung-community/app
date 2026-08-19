/**
 * @fileoverview The settings snapshot slice — hydrate once, write through `set`,
 * mirror the cue switches. Phases per docs/11-testing-conventions.md.
 */

import {beforeEach, describe, expect, it} from 'vitest';

import type {CuePreferences} from '../domain/cue';
import type {CuePlayer} from '../ports/cue-player';
import {DEFAULT_SETTINGS, type Settings, type SettingsStore} from '../ports/settings-store';

import {override, resetContainer} from '../composition/container';
import {useSettings} from './settings';

/** A store double that records every load and save, so write-through is assertable. */
function fakeStore(initial: Settings): SettingsStore & {
  loads: () => number;
  saved: () => readonly Settings[];
} {
  let loads = 0;
  const saves: Settings[] = [];
  return {
    async load() {
      loads += 1;
      return initial;
    },
    async save(next) {
      saves.push(next);
    },
    loads: () => loads,
    saved: () => saves,
  };
}

/** A player double that records every applied preference, so forwarding is assertable. */
function fakeCuePlayer(): CuePlayer & {applied: () => readonly CuePreferences[]} {
  const applied: CuePreferences[] = [];
  return {
    async play() {},
    async setPreferences(preferences) {
      applied.push(preferences);
    },
    applied: () => applied,
  };
}

beforeEach(() => {
  resetContainer();
  override('cues', fakeCuePlayer());
  useSettings.setState({settings: null});
});

describe('hydrate', () => {
  it('loads the stored settings once', async () => {
    // Given
    const store = fakeStore({...DEFAULT_SETTINGS, wylie: true});
    override('settings', store);

    // When
    await useSettings.getState().hydrate();
    await useSettings.getState().hydrate();

    // Then
    expect(useSettings.getState().settings).toEqual({...DEFAULT_SETTINGS, wylie: true});
    expect(store.loads()).toBe(1);
  });

  it('forwards the loaded sound and haptics switches to the cue player', async () => {
    // Given
    override('settings', fakeStore({...DEFAULT_SETTINGS, sound: false, haptics: true}));
    const player = fakeCuePlayer();
    override('cues', player);

    // When
    await useSettings.getState().hydrate();

    // Then
    expect(player.applied()).toEqual([{sound: false, haptics: true}]);
  });
});

describe('set', () => {
  it('merges the change into the current settings and persists the merged value', async () => {
    // Given
    const store = fakeStore(DEFAULT_SETTINGS);
    override('settings', store);
    await useSettings.getState().hydrate();

    // When
    await useSettings.getState().set({wylie: true});

    // Then
    expect(useSettings.getState().settings).toEqual({...DEFAULT_SETTINGS, wylie: true});
    expect(store.saved()).toEqual([{...DEFAULT_SETTINGS, wylie: true}]);
  });

  it('forwards the merged sound and haptics switches to the cue player', async () => {
    // Given
    override('settings', fakeStore(DEFAULT_SETTINGS));
    const player = fakeCuePlayer();
    override('cues', player);
    await useSettings.getState().hydrate();

    // When
    const applied = player.applied().length;
    await useSettings.getState().set({sound: false});

    // Then
    expect(player.applied().slice(applied)).toEqual([{sound: false, haptics: true}]);
  });

  it('wins over a hydrate that resolves later', async () => {
    // Given — a load that stays pending until the test releases it
    let release!: (settings: Settings) => void;
    const pending = new Promise<Settings>(resolve => {
      release = resolve;
    });
    const store: SettingsStore = {
      load: () => pending,
      async save() {},
    };
    override('settings', store);
    const hydrating = useSettings.getState().hydrate();

    // When — the learner changes a setting before the load resolves
    const changed = useSettings.getState().set({wylie: true});
    release(DEFAULT_SETTINGS);
    await Promise.all([hydrating, changed]);

    // Then — the late snapshot does not overwrite the change
    expect(useSettings.getState().settings).toEqual({...DEFAULT_SETTINGS, wylie: true});
  });

  it('updates state synchronously, before the save resolves', async () => {
    // Given — a save that stays pending until the test releases it
    let resolveSave: () => void = () => {};
    const store: SettingsStore = {
      async load() {
        return DEFAULT_SETTINGS;
      },
      save() {
        return new Promise(resolve => {
          resolveSave = resolve;
        });
      },
    };
    override('settings', store);

    // When
    const setPromise = useSettings.getState().set({wylie: true});

    // Then — state is already merged, though the save has not settled yet
    expect(useSettings.getState().settings).toEqual({...DEFAULT_SETTINGS, wylie: true});
    await Promise.resolve();
    resolveSave();
    await setPromise;
  });
});
