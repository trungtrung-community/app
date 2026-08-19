/**
 * @fileoverview The settings adapter, tested against a fake key/value store.
 *
 * Mirrors `mmkv-progress-store.test.ts`: a fake rather than a mock, three real
 * methods over a Map, so the assertions are about stored state. The `beforeEach`
 * is the shared Given — a store with nothing in it — so a test that adds no setup
 * of its own starts at `// When`.
 */

import {beforeEach, describe, expect, it} from 'vitest';

import type {Settings} from '../../ports/settings-store';
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

const DEFAULTS: Settings = {wylie: false};

let storage: FakeKeyValueStore;
let store: MmkvSettingsStore;

beforeEach(() => {
  storage = new FakeKeyValueStore();
  store = new MmkvSettingsStore(storage);
});

describe('load', () => {
  it('returns the defaults on a first launch', async () => {
    // When
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(DEFAULTS);
  });

  it('round-trips what was saved', async () => {
    // Given
    const settings: Settings = {wylie: true};

    // When
    await store.save(settings);
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(settings);
  });

  it('returns the defaults rather than throwing when the stored value is corrupt', async () => {
    // Given
    storage.plant('settings', '{not json');

    // When
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(DEFAULTS);
  });
});
