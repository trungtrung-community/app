/**
 * @fileoverview Progress persisted to MMKV.
 *
 * The store depends on a three-method key/value interface rather than on MMKV
 * itself. That keeps the serialisation, migration and merge logic — the part with
 * rules in it — testable in a plain Vitest run, and confines the native module to
 * one factory function.
 *
 * It also matters practically: `react-native-mmkv` v4 is built on Nitro modules,
 * which are native C++ and therefore absent from Expo Go. Creating the instance
 * lazily means importing this file cannot break a client that never saves
 * anything.
 */

import type {Progress, ProgressStore} from '../../ports/progress-store';

/** The slice of MMKV this adapter needs. Small enough to fake in a test. */
export type KeyValueStore = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  /** MMKV v4 names this `remove`, not `delete`. */
  remove(key: string): void;
};

const KEY = 'progress';

/** Bumped when the stored shape changes, so a restore migrates rather than guesses. */
export const PROGRESS_VERSION = 1;

const EMPTY: Progress = {walkedOn: [], items: {}, version: PROGRESS_VERSION};

export class MmkvProgressStore implements ProgressStore {
  constructor(private readonly storage: KeyValueStore) {}

  async load(): Promise<Progress> {
    const raw = this.storage.getString(KEY);
    if (raw === undefined) {
      return EMPTY;
    }
    // A learner's whole history lives here, so a parse failure must not wipe it:
    // report empty and leave the bytes alone for a later migration to inspect.
    try {
      return migrate(JSON.parse(raw) as Progress);
    } catch {
      return EMPTY;
    }
  }

  async save(progress: Progress): Promise<void> {
    this.storage.set(KEY, JSON.stringify(progress));
  }

  async export(): Promise<string> {
    // Indented because the backup file is meant to be human-readable — a learner
    // can see what they are carrying between devices.
    return JSON.stringify(await this.load(), null, 2);
  }

  async clear(): Promise<void> {
    this.storage.remove(KEY);
  }
}

/**
 * Bring a stored record up to the current shape.
 *
 * Unversioned records predate the field and are treated as version 0.
 */
function migrate(stored: Progress): Progress {
  const version = stored.version ?? 0;
  if (version === PROGRESS_VERSION) {
    return stored;
  }
  // No migrations exist yet. When the first one lands it goes here, stepwise, so
  // a learner two versions behind is carried through each step rather than reset.
  return {...stored, version: PROGRESS_VERSION};
}

/**
 * The real MMKV-backed store.
 *
 * Call this from src/composition only, and only when progress is actually needed:
 * it touches a native module that does not exist in Expo Go.
 */
export function createMmkvProgressStore(): ProgressStore {
  // require, not import: a static import is hoisted and would pull the native
  // module in for anyone who merely imports the container, which breaks Expo Go
  // even on a screen that saves nothing.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {createMMKV} = require('react-native-mmkv') as typeof import('react-native-mmkv');
  const mmkv = createMMKV({id: 'trungtrung.progress'});
  return new MmkvProgressStore(mmkv);
}
