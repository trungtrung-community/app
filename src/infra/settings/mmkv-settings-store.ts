/**
 * @fileoverview Settings persisted to MMKV.
 *
 * Same reasoning as `mmkv-progress-store.ts`: the store depends on a three-method
 * key/value interface rather than on MMKV itself, which keeps defaulting and
 * corrupt-value handling testable in a plain Vitest run and confines the native
 * module to one factory function. `react-native-mmkv` v4 is built on Nitro
 * modules — absent from Expo Go — so creating the instance lazily means importing
 * this file cannot break a client that never saves a setting.
 */

import type {Settings, SettingsStore} from '../../ports/settings-store';
import type {KeyValueStore} from '../progress/mmkv-progress-store';

export type {KeyValueStore} from '../progress/mmkv-progress-store';

const KEY = 'settings';

const DEFAULTS: Settings = {wylie: false};

export class MmkvSettingsStore implements SettingsStore {
  constructor(private readonly storage: KeyValueStore) {}

  async load(): Promise<Settings> {
    const raw = this.storage.getString(KEY);
    if (raw === undefined) {
      return DEFAULTS;
    }
    // A parse failure falls back to the defaults rather than throwing — a bad
    // stored value must not stop the app from rendering a settings screen.
    try {
      return {...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>)};
    } catch {
      return DEFAULTS;
    }
  }

  async save(settings: Settings): Promise<void> {
    this.storage.set(KEY, JSON.stringify(settings));
  }
}

/**
 * The real MMKV-backed store.
 *
 * Call this from src/composition only, and only when settings are actually
 * needed: it touches a native module that does not exist in Expo Go.
 */
export function createMmkvSettingsStore(): SettingsStore {
  // require, not import: a static import is hoisted and would pull the native
  // module in for anyone who merely imports the container, which breaks Expo Go
  // even on a screen that saves nothing.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {createMMKV} = require('react-native-mmkv') as typeof import('react-native-mmkv');
  const mmkv = createMMKV({id: 'trungtrung.settings'});
  return new MmkvSettingsStore(mmkv);
}
