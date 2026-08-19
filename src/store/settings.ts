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

import type {Settings} from '../ports/settings-store';

import {settings as settingsStore} from '../composition/container';

const DEFAULTS: Settings = {wylie: false};

type SettingsSlice = {
  /** The hydrated settings, or null until `hydrate` resolves. */
  settings: Settings | null;
  /** Load the stored settings, once. Later calls resolve without another load. */
  hydrate(): Promise<void>;
  /** Merge `next` into the current settings, apply it, then persist through the port. */
  set(next: Partial<Settings>): Promise<void>;
};

export const useSettings = create<SettingsSlice>()((set, get) => ({
  settings: null,
  async hydrate() {
    if (get().settings !== null) {
      return;
    }
    const store = await settingsStore();
    set({settings: await store.load()});
  },
  async set(next) {
    const merged = {...(get().settings ?? DEFAULTS), ...next};
    set({settings: merged});
    const store = await settingsStore();
    await store.save(merged);
  },
}));
