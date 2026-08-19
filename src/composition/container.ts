/**
 * @fileoverview The only file that knows which adapter implements which port.
 *
 * This is where a migration lands. Serving audio from a backend means adding a
 * remote adapter and a caching decorator and changing one line here — no screen, use
 * case or rule changes. That return is real but uneven: it holds best for audio,
 * holds well for content, and for progress it localises the work rather than
 * shrinking it. See docs/architecture.md.
 *
 * Accessors are async and memoised. Async because opening the bundled content
 * database is genuinely asynchronous, and uniform because a caller that has to know
 * which adapters happen to be cheap to construct is coupled to the answer. Memoised
 * because nothing should pay twice, and because `react-native-mmkv` v4 is built on
 * Nitro modules — absent from Expo Go — so the native module must not load until
 * something actually saves.
 */

import {Platform} from 'react-native';

import type {AudioSource, ContentSource, CuePlayer, ProgressStore, SettingsStore} from '../ports';
import type {AppStateStore} from '../ports/app-state-store';
import type {ReminderScheduler} from '../ports/reminder-scheduler';

import {BundledAudioSource} from '../infra/audio/bundled-audio-source';
import {createMmkvAppStateStore} from '../infra/state/mmkv-app-state-store';
import {JsonContentSource} from '../infra/content/json-content-source';
import type {ContentFixture} from '../infra/content/rows.generated';
import {SqliteContentSource} from '../infra/content/sqlite-content-source';
import {createMmkvProgressStore} from '../infra/progress/mmkv-progress-store';
import {createMmkvSettingsStore} from '../infra/settings/mmkv-settings-store';

type Registry = {
  content: ContentSource;
  progress: ProgressStore;
  audio: AudioSource;
  cues: CuePlayer;
  settings: SettingsStore;
  appState: AppStateStore;
  reminders: ReminderScheduler;
};

const memo = new Map<keyof Registry, Promise<Registry[keyof Registry]>>();

function once<K extends keyof Registry>(
  key: K,
  make: () => Promise<Registry[K]>,
): Promise<Registry[K]> {
  if (!memo.has(key)) {
    memo.set(key, make());
  }
  return memo.get(key) as Promise<Registry[K]>;
}

/**
 * Content, from SQLite on a device and from the committed fixture on web.
 *
 * The web adapter is not a fallback. `expo-sqlite`'s web support is alpha and
 * `docs/06-testing.md` runs the whole end-to-end suite on the Expo web build, so web
 * needs a source that works today — which is the port earning its keep now rather
 * than in some future migration.
 */
export function content(): Promise<ContentSource> {
  return once('content', async () => {
    if (Platform.OS === 'web') {
      const fixture = require('../infra/content/content.fixture.json') as ContentFixture;
      return new JsonContentSource(fixture);
    }
    const {openContentDatabase} = await import('../infra/content/open-content-database');
    return new SqliteContentSource(await openContentDatabase());
  });
}

/**
 * Progress and settings both persist through the MMKV-shaped stores; on web the
 * native module does not exist, so the same stores run over localStorage. The
 * serialisation and migration logic is shared either way — only the medium is
 * chosen here.
 */
export function progress(): Promise<ProgressStore> {
  return once('progress', async () => {
    if (Platform.OS === 'web') {
      const {MmkvProgressStore} = await import('../infra/progress/mmkv-progress-store');
      const {pageStorage, webKeyValueStore} = await import('../infra/storage/web-key-value-store');
      return new MmkvProgressStore(webKeyValueStore(pageStorage()));
    }
    return createMmkvProgressStore();
  });
}

export function settings(): Promise<SettingsStore> {
  return once('settings', async () => {
    if (Platform.OS === 'web') {
      const {MmkvSettingsStore} = await import('../infra/settings/mmkv-settings-store');
      const {pageStorage, webKeyValueStore} = await import('../infra/storage/web-key-value-store');
      return new MmkvSettingsStore(webKeyValueStore(pageStorage()));
    }
    return createMmkvSettingsStore();
  });
}

/**
 * Device bookkeeping — the parked session, nudge dates, primer flags. Persists
 * the same way progress and settings do: MMKV on a device, localStorage on web,
 * with the medium chosen here and nowhere else.
 */
export function appState(): Promise<AppStateStore> {
  return once('appState', async () => {
    if (Platform.OS === 'web') {
      const {MmkvAppStateStore} = await import('../infra/state/mmkv-app-state-store');
      const {pageStorage, webKeyValueStore} = await import('../infra/storage/web-key-value-store');
      return new MmkvAppStateStore(webKeyValueStore(pageStorage()));
    }
    return createMmkvAppStateStore();
  });
}

export function audio(): Promise<AudioSource> {
  return once('audio', async () => new BundledAudioSource());
}

/**
 * Interface sound and haptics — silent on web, and that is the design.
 *
 * `docs/06` runs the whole Playwright suite against the Expo web build, where
 * `expo-haptics` does not exist and a tick on every assertion is noise. The component
 * suite renders through the same react-native-web path, so it inherits the same answer.
 *
 * The device adapter is reached by dynamic import rather than named at the top of this
 * file, for the reason the header gives about MMKV: importing the container must not drag
 * a native module in behind it. Here the module is `expo-audio`, and the consequence of
 * being careless is that every test file pays to load an audio engine it never asks to
 * play.
 */
export function cues(): Promise<CuePlayer> {
  return once('cues', async () => {
    if (Platform.OS === 'web') {
      const {SilentCuePlayer} = await import('../infra/cues/silent-cue-player');
      return new SilentCuePlayer();
    }
    const {createDeviceCuePlayer} = await import('../infra/cues/device-cue-player');
    return createDeviceCuePlayer();
  });
}

/**
 * The daily reminder window — real local notifications on a device, silence on web.
 *
 * The silent adapter is web's honest answer, not a fallback; its file says why. The
 * device adapter is reached by dynamic import for the reason `cues` gives: importing
 * the container must not drag `expo-notifications` in behind it, or every test file
 * pays to load a notification module it never schedules with.
 */
export function reminders(): Promise<ReminderScheduler> {
  return once('reminders', async () => {
    if (Platform.OS === 'web') {
      const {SilentReminderScheduler} =
        await import('../infra/notifications/silent-reminder-scheduler');
      return new SilentReminderScheduler();
    }
    const {ExpoReminderScheduler} = await import('../infra/notifications/expo-reminder-scheduler');
    return new ExpoReminderScheduler();
  });
}

/**
 * Replace an adapter, for tests and for the specimen gallery.
 *
 * The gallery renders real content-spec vocabulary rather than placeholder text,
 * which is a design-system rule, so it needs to choose its own source.
 */
export function override<K extends keyof Registry>(key: K, value: Registry[K]): void {
  memo.set(key, Promise.resolve(value));
}

/** Drop every memoised adapter. Call between tests. */
export function resetContainer(): void {
  memo.clear();
}
