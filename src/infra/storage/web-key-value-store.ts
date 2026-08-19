/**
 * @fileoverview The browser's localStorage as the three-method KeyValueStore.
 *
 * The MMKV-shaped stores take a small key/value interface precisely so a second
 * medium is one adapter away — this is that adapter for the web, where the
 * native module does not exist. Keys are namespaced so nothing else served from
 * the same origin collides.
 */

import type {KeyValueStore} from '../progress/mmkv-progress-store';

/** The slice of the DOM Storage interface this needs; typed structurally so the
 * pure test can hand in a fake without the DOM lib. */
export type WebStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const PREFIX = 'trungtrung.';

export function webKeyValueStore(storage: WebStorage): KeyValueStore {
  return {
    getString: key => storage.getItem(PREFIX + key) ?? undefined,
    set: (key, value) => storage.setItem(PREFIX + key, value),
    remove: key => storage.removeItem(PREFIX + key),
  };
}

/**
 * The page's localStorage, or an in-memory stand-in where it is absent, so a
 * missing storage never crashes the app — it just forgets on reload.
 */
export function pageStorage(): WebStorage {
  const candidate = (globalThis as {localStorage?: WebStorage}).localStorage;
  if (candidate !== undefined) {
    return candidate;
  }
  const map = new Map<string, string>();
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: key => void map.delete(key),
  };
}
