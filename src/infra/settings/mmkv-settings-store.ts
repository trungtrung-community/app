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

import {DEFAULT_SETTINGS, SETTINGS_VERSION} from '../../ports/settings-store';
import type {Settings, SettingsStore} from '../../ports/settings-store';
import type {KeyValueStore} from '../progress/mmkv-progress-store';

export type {KeyValueStore} from '../progress/mmkv-progress-store';

const KEY = 'settings';

/** What a load may find: any past shape, so every field is optional. */
type StoredSettings = Partial<Omit<Settings, 'version' | 'pace'>> & {
  readonly version?: number;
  /** Any pace ever written, including v2's short-lived `'p15'`. */
  readonly pace?: Settings['pace'] | 'p15';
};

export class MmkvSettingsStore implements SettingsStore {
  constructor(private readonly storage: KeyValueStore) {}

  async load(): Promise<Settings> {
    const raw = this.storage.getString(KEY);
    if (raw === undefined) {
      return DEFAULT_SETTINGS;
    }
    // A parse failure falls back to the defaults rather than throwing — a bad
    // stored value must not stop the app from rendering a settings screen.
    try {
      return migrate(JSON.parse(raw) as StoredSettings);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async save(settings: Settings): Promise<void> {
    this.storage.set(KEY, JSON.stringify(settings));
  }
}

/**
 * Bring a stored record up to the current shape.
 *
 * Unversioned records predate the field and are treated as version 1, which held
 * only `wylie`.
 */
function migrate(stored: StoredSettings): Settings {
  const version = stored.version ?? 1;
  if (version === SETTINGS_VERSION) {
    // `'p15'` is v2's own early name for the third pace slot, renamed when the
    // board's four options landed. Same shape version, so the map lives here
    // rather than behind a bump.
    const pace = stored.pace === 'p15' ? 'p20' : stored.pace;
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      version: SETTINGS_VERSION,
      pace: pace ?? DEFAULT_SETTINGS.pace,
    };
  }
  // A version-1 record keeps its `wylie` and takes the default for every field it
  // predates. Later migrations stack here, stepwise, so a learner two versions
  // behind is carried through each step rather than reset.
  return {...DEFAULT_SETTINGS, wylie: stored.wylie ?? DEFAULT_SETTINGS.wylie};
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
