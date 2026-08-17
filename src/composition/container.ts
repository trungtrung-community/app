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

import type {AudioSource, ContentSource, ProgressStore} from '../ports';

import {BundledAudioSource} from '../infra/audio/bundled-audio-source';
import {JsonContentSource, type ContentFixture} from '../infra/content/json-content-source';
import {SqliteContentSource} from '../infra/content/sqlite-content-source';
import {createMmkvProgressStore} from '../infra/progress/mmkv-progress-store';

type Registry = {
  content: ContentSource;
  progress: ProgressStore;
  audio: AudioSource;
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

export function progress(): Promise<ProgressStore> {
  return once('progress', async () => createMmkvProgressStore());
}

export function audio(): Promise<AudioSource> {
  return once('audio', async () => new BundledAudioSource());
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
