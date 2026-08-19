/**
 * @fileoverview localStorage as the three-method KeyValueStore the MMKV-shaped
 * stores are built on, tested through a fake Storage. Phases per docs/11.
 */

import {describe, expect, it} from 'vitest';

import {MmkvProgressStore} from '../progress/mmkv-progress-store';
import {webKeyValueStore, type WebStorage} from './web-key-value-store';

function fakeStorage(): WebStorage & {keys: () => readonly string[]} {
  const map = new Map<string, string>();
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: key => void map.delete(key),
    keys: () => [...map.keys()],
  };
}

describe('webKeyValueStore', () => {
  it('round-trips a value', () => {
    // Given
    const store = webKeyValueStore(fakeStorage());

    // When
    store.set('progress', '{"walkedOn":[]}');

    // Then
    expect(store.getString('progress')).toBe('{"walkedOn":[]}');
  });

  it('namespaces its keys, so nothing else in the origin collides', () => {
    // Given
    const storage = fakeStorage();
    const store = webKeyValueStore(storage);

    // When
    store.set('progress', 'x');

    // Then
    expect(storage.keys()).toEqual(['trungtrung.progress']);
  });

  it('removes what it set', () => {
    // Given
    const store = webKeyValueStore(fakeStorage());
    store.set('progress', 'x');

    // When
    store.remove('progress');

    // Then
    expect(store.getString('progress')).toBeUndefined();
  });

  it('carries a whole ProgressStore on web', async () => {
    // Given — the MMKV-shaped store over the web key-value store
    const store = new MmkvProgressStore(webKeyValueStore(fakeStorage()));
    const progress = {
      walkedOn: ['2026-08-19'],
      items: {},
      completedStops: ['stop.core.c1.1'],
      version: 2,
    };

    // When
    await store.save(progress);

    // Then
    expect(await store.load()).toEqual(progress);
  });
});
