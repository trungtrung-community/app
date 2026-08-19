/**
 * @fileoverview The progress adapter, tested against a fake key/value store.
 *
 * A fake rather than a mock: three real methods over a Map, so the assertions are
 * about stored state rather than about which calls were made. This is only cheap
 * because the port is small — twelve repositories would push you toward a mock
 * framework and toward tests that pass while the behaviour is wrong.
 *
 * Phases are marked per `docs/11-testing-conventions.md`. The `beforeEach` is the
 * shared Given — a store with nothing in it — so a test that adds no setup of its own
 * starts at `// When`.
 */

import {beforeEach, describe, expect, it} from 'vitest';

import type {Progress} from '../../ports/progress-store';
import {MmkvProgressStore, PROGRESS_VERSION, type KeyValueStore} from './mmkv-progress-store';

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

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: PROGRESS_VERSION};

let storage: FakeKeyValueStore;
let store: MmkvProgressStore;

beforeEach(() => {
  storage = new FakeKeyValueStore();
  store = new MmkvProgressStore(storage);
});

describe('load', () => {
  it('returns an empty record on a first launch', async () => {
    // When
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(EMPTY);
  });

  it('round-trips what was saved', async () => {
    // Given
    const progress: Progress = {
      walkedOn: ['2026-08-17'],
      items: {},
      completedStops: [],
      version: PROGRESS_VERSION,
    };

    // When
    await store.save(progress);
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(progress);
  });

  it('reports empty rather than throwing when the stored value is corrupt', async () => {
    // Given
    storage.plant('progress', '{not json');

    // When
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(EMPTY);
  });

  it('leaves a corrupt value in place, so a later migration can inspect it', async () => {
    // Given
    storage.plant('progress', '{not json');

    // When
    await store.load();

    // Then
    expect(storage.getString('progress')).toBe('{not json');
  });

  it('reports empty when the stored value parses but was never a progress record', async () => {
    // Given
    storage.plant('progress', JSON.stringify({foo: 'bar'}));

    // When
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(EMPTY);
  });

  it('migrates an older record through the domain migration', async () => {
    // Given
    storage.plant('progress', JSON.stringify({walkedOn: ['2026-08-01'], items: {}, version: 1}));

    // When
    const loaded = await store.load();

    // Then
    expect(loaded.completedStops).toEqual([]);
    expect(loaded.version).toBe(PROGRESS_VERSION);
  });
});

describe('export', () => {
  it('is indented, because a learner reads the backup file', async () => {
    // Given
    await store.save({
      walkedOn: ['2026-08-17'],
      items: {},
      completedStops: [],
      version: PROGRESS_VERSION,
    });

    // When
    const exported = await store.export();

    // Then
    expect(exported).toContain('\n  ');
  });
});

describe('clear', () => {
  it('leaves a first-launch record behind', async () => {
    // Given
    await store.save({
      walkedOn: ['2026-08-17'],
      items: {},
      completedStops: [],
      version: PROGRESS_VERSION,
    });

    // When
    await store.clear();
    const loaded = await store.load();

    // Then
    expect(loaded).toEqual(EMPTY);
  });
});
