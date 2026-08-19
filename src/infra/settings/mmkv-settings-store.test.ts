/**
 * @fileoverview The settings adapter, tested against a fake key/value store.
 *
 * Mirrors `mmkv-progress-store.test.ts`: a fake rather than a mock, three real
 * methods over a Map, so the assertions are about stored state. The `beforeEach`
 * is the shared Given — a store with nothing in it — so a test that adds no setup
 * of its own starts at `// When`.
 */

import {beforeEach, describe, expect, it} from 'vitest';

import {DEFAULT_SETTINGS, type Settings} from '../../ports/settings-store';
import {MmkvSettingsStore, type KeyValueStore} from './mmkv-settings-store';

class FakeKeyValueStore implements KeyValueStore {
  private readonly map = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.map.get(key);
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }

  remove(key: string): void {
    this.map.delete(key);
  }

  /** Test-only: plant a raw value, including one the adapter would not have written. */
  plant(key: string, value: string): void {
    this.map.set(key, value);
  }
}

let storage: FakeKeyValueStore;
let store: MmkvSettingsStore;

beforeEach(() => {
  storage = new FakeKeyValueStore();
  store = new MmkvSettingsStore(storage);
});

describe('load', () => {
  it('returns the defaults on a first launch, with wylie off', async () => {
    // When
    const loaded = await store.load();

    // Then — spelled out, so a changed default fails here rather than shipping
    expect(loaded).toEqual({
      version: 2,
      wylie: false,
      sound: true,
      haptics: true,
      audioFree: false,
      track: 'speak',
      pace: 'p5',
      reminder: {enabled: false, hour: 19, minute: 0},
      onboardedOn: null,
    });
  });

  it('round-trips what was saved, version included', async () => {
    // Given
    const settings: Settings = {
      ...DEFAULT_SETTINGS,
      wylie: true,
      sound: false,
      track: 'both',
      pace: 'p20',
      reminder: {enabled: true, hour: 7, minute: 30},
      onboardedOn: '2026-08-19',
    };

    // When
    await store.save(settings);
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(settings);
    expect(JSON.parse(storage.getString('settings') ?? '{}')).toMatchObject({version: 2});
  });

  it('returns the defaults rather than throwing when the stored value is corrupt', async () => {
    // Given
    storage.plant('settings', '{not json');

    // When
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(DEFAULT_SETTINGS);
  });

  it("maps a v2 record's early 'p15' pace to 'p20', keeping every other field", async () => {
    // Given
    storage.plant('settings', JSON.stringify({...DEFAULT_SETTINGS, wylie: true, pace: 'p15'}));

    // When
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual({...DEFAULT_SETTINGS, wylie: true, pace: 'p20'});
  });

  it('migrates an unversioned record as v1, keeping wylie and gaining the v2 defaults', async () => {
    // Given
    storage.plant('settings', JSON.stringify({wylie: true}));

    // When
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual({...DEFAULT_SETTINGS, wylie: true});
  });
});
