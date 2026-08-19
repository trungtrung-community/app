/**
 * @fileoverview The settings snapshot — hydrated once, read synchronously, written
 * through immediately.
 *
 * Unlike progress, a setting has exactly one writer: the learner, from the
 * settings screen. `set` both updates the slice and persists through the port in
 * the same call, rather than splitting into a use case and a separate `apply`.
 * State updates before the save is awaited, so a toggle reflects the tap
 * immediately and does not wait on MMKV.
 */

import {create} from 'zustand';

import {DEFAULT_SETTINGS, type Settings} from '../ports/settings-store';

import {settings as settingsStore} from '../composition/container';
import {setCuePreferences} from '../composition/cue';

/**
 * Mirror the sound and vibration switches into the cue player.
 *
 * The single wire point: the boot hydrate and every later `set` both pass through
 * here, so the player and the slice cannot disagree about the learner's switches.
 */
function forwardCuePreferences(settings: Settings): Promise<void> {
  return setCuePreferences({sound: settings.sound, haptics: settings.haptics});
}

type SettingsSlice = {
  /** The hydrated settings, or null until `hydrate` resolves. */
  settings: Settings | null;
  /** Load the stored settings, once. Later calls resolve without another load. */
  hydrate(): Promise<void>;
  /** Merge `next` into the current settings, apply it, then persist through the port. */
  set(next: Partial<Settings>): Promise<void>;
};

/** The in-flight load, shared by concurrent hydrates and cleared when it settles. */
let loading: Promise<void> | null = null;

export const useSettings = create<SettingsSlice>()((set, get) => ({
  settings: null,
  hydrate() {
    if (get().settings !== null) {
      return Promise.resolve();
    }
    loading ??= (async () => {
      try {
        const store = await settingsStore();
        const snapshot = await store.load();
        // A `set` may have landed while the load ran; the learner's change is
        // newer than what the store held, so it wins — and has already forwarded
        // its own switches, so the stale snapshot's are not applied either.
        if (get().settings === null) {
          set({settings: snapshot});
          await forwardCuePreferences(snapshot);
        }
      } finally {
        loading = null;
      }
    })();
    return loading;
  },
  async set(next) {
    const merged = {...(get().settings ?? DEFAULT_SETTINGS), ...next};
    set({settings: merged});
    const store = await settingsStore();
    await store.save(merged);
    await forwardCuePreferences(merged);
  },
}));
