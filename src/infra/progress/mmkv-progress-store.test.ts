/**
 * @fileoverview The progress adapter, tested against a fake key/value store.
 *
 * A fake rather than a mock: three real methods over a Map, so the assertions are
 * about stored state rather than about which calls were made. This is only cheap
 * because the port is small — twelve repositories would push you toward a mock
 * framework and toward tests that pass while the behaviour is wrong.
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

let storage: FakeKeyValueStore;
let store: MmkvProgressStore;

beforeEach(() => {
  storage = new FakeKeyValueStore();
  store = new MmkvProgressStore(storage);
});

describe('load', () => {
  it('returns an empty record on a first launch', async () => {
    await expect(store.load()).resolves.toEqual({
      walkedOn: [],
      items: {},
      version: PROGRESS_VERSION,
    });
  });

  it('round-trips what was saved', async () => {
    const progress: Progress = {walkedOn: ['2026-08-17'], items: {}, version: PROGRESS_VERSION};
    await store.save(progress);
    await expect(store.load()).resolves.toEqual(progress);
  });

  it('reports empty rather than throwing when the stored value is corrupt', async () => {
    storage.plant('progress', '{not json');
    await expect(store.load()).resolves.toEqual({
      walkedOn: [],
      items: {},
      version: PROGRESS_VERSION,
    });
  });

  it('leaves a corrupt value in place, so a later migration can inspect it', async () => {
    storage.plant('progress', '{not json');
    await store.load();
    expect(storage.getString('progress')).toBe('{not json');
  });

  it('carries an unversioned record forward', async () => {
    storage.plant('progress', JSON.stringify({walkedOn: ['2026-08-01'], items: {}}));
    const loaded = await store.load();
    expect(loaded.version).toBe(PROGRESS_VERSION);
    expect(loaded.walkedOn).toEqual(['2026-08-01']);
  });
});

describe('export', () => {
  it('is indented, because a learner reads the backup file', async () => {
    await store.save({walkedOn: ['2026-08-17'], items: {}, version: PROGRESS_VERSION});
    expect(await store.export()).toContain('\n  ');
  });
});

describe('clear', () => {
  it('leaves a first-launch record behind', async () => {
    await store.save({walkedOn: ['2026-08-17'], items: {}, version: PROGRESS_VERSION});
    await store.clear();
    await expect(store.load()).resolves.toEqual({
      walkedOn: [],
      items: {},
      version: PROGRESS_VERSION,
    });
  });
});
