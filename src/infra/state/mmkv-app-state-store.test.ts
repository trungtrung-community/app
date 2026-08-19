/**
 * @fileoverview The app-state adapter, tested against a fake key/value store.
 *
 * A fake rather than a mock, for the reason the progress test gives: three real
 * methods over a Map, so the assertions are about stored state rather than about
 * which calls were made.
 */

import {beforeEach, describe, expect, it} from 'vitest';

import {APP_STATE_VERSION, DEFAULT_APP_STATE, type AppState} from '../../ports/app-state-store';
import {MmkvAppStateStore, type KeyValueStore} from './mmkv-app-state-store';

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
let store: MmkvAppStateStore;

beforeEach(() => {
  storage = new FakeKeyValueStore();
  store = new MmkvAppStateStore(storage);
});

describe('load', () => {
  it('returns the defaults on a first launch', async () => {
    // When
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(DEFAULT_APP_STATE);
  });

  it('round-trips what was saved', async () => {
    // Given
    const state: AppState = {
      version: APP_STATE_VERSION,
      session: {
        stopId: 'stop-1',
        contentVersion: '3',
        savedAt: '2026-08-19T08:00:00.000Z',
        state: {queue: [], index: 0},
      },
      lastNudgeOn: '2026-08-18',
      micPrimerSeen: true,
    };

    // When
    await store.save(state);
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(state);
  });

  it('reports the defaults rather than throwing when the stored value is corrupt', async () => {
    // Given
    storage.plant('state', '{not json');

    // When
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(DEFAULT_APP_STATE);
  });

  it('leaves a corrupt value in place, so a later migration can inspect it', async () => {
    // Given
    storage.plant('state', '{not json');

    // When
    await store.load();

    // Then
    expect(storage.getString('state')).toBe('{not json');
  });

  it('stamps the current version on what it loads', async () => {
    // Given
    storage.plant('state', JSON.stringify({version: APP_STATE_VERSION, micPrimerSeen: true}));

    // When
    const loaded = await store.load();

    // Then
    expect(loaded.version).toBe(APP_STATE_VERSION);
    expect(loaded.micPrimerSeen).toBe(true);
    expect(loaded.session).toBeNull();
  });

  it('returns the defaults for a record from an unknown shape', async () => {
    // Given — no version field, which no shipped shape ever wrote
    storage.plant('state', JSON.stringify({micPrimerSeen: true}));

    // When
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(DEFAULT_APP_STATE);
  });
});
