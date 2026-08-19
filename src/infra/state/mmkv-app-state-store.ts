/**
 * @fileoverview App state persisted to MMKV.
 *
 * Same reasoning as `mmkv-progress-store.ts`: the store depends on a three-method
 * key/value interface rather than on MMKV itself, which keeps defaulting and
 * corrupt-value handling testable in a plain Vitest run and confines the native
 * module to one factory function. `react-native-mmkv` v4 is built on Nitro
 * modules — absent from Expo Go — so creating the instance lazily means importing
 * this file cannot break a client that never parks a session.
 */

import {APP_STATE_VERSION, DEFAULT_APP_STATE} from '../../ports/app-state-store';
import type {AppState, AppStateStore} from '../../ports/app-state-store';
import type {KeyValueStore} from '../progress/mmkv-progress-store';

export type {KeyValueStore} from '../progress/mmkv-progress-store';

const KEY = 'state';

/** What a load may find: any past shape, so every field is optional. */
type StoredAppState = Partial<Omit<AppState, 'version'>> & {readonly version?: number};

export class MmkvAppStateStore implements AppStateStore {
  constructor(private readonly storage: KeyValueStore) {}

  async load(): Promise<AppState> {
    const raw = this.storage.getString(KEY);
    if (raw === undefined) {
      return DEFAULT_APP_STATE;
    }
    // A parse failure reports the defaults and leaves the bytes alone for a later
    // migration to inspect — the same stance as progress. The stakes are lower
    // here (a lost record only restarts a stop), but silently destroying evidence
    // would be the same mistake.
    try {
      return migrate(JSON.parse(raw) as StoredAppState);
    } catch {
      return DEFAULT_APP_STATE;
    }
  }

  async save(state: AppState): Promise<void> {
    this.storage.set(KEY, JSON.stringify(state));
  }
}

/**
 * Bring a stored record up to the current shape.
 *
 * Version 1 is the first shape, so there is nothing to carry forward yet. Later
 * migrations stack here, stepwise, so a device two versions behind is carried
 * through each step rather than reset.
 */
function migrate(stored: StoredAppState): AppState {
  if (stored.version === APP_STATE_VERSION) {
    return {...DEFAULT_APP_STATE, ...stored, version: APP_STATE_VERSION};
  }
  return DEFAULT_APP_STATE;
}

/**
 * The real MMKV-backed store.
 *
 * Call this from src/composition only, and only when app state is actually
 * needed: it touches a native module that does not exist in Expo Go.
 */
export function createMmkvAppStateStore(): AppStateStore {
  // require, not import: a static import is hoisted and would pull the native
  // module in for anyone who merely imports the container, which breaks Expo Go
  // even on a screen that saves nothing.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {createMMKV} = require('react-native-mmkv') as typeof import('react-native-mmkv');
  const mmkv = createMMKV({id: 'trungtrung.state'});
  return new MmkvAppStateStore(mmkv);
}
