/**
 * @fileoverview The web build's stand-in for opening the content database. It never opens one.
 *
 * **This file exists because a `Platform.OS` check does not keep a module out of a
 * bundle.** `src/composition/container.ts` reaches SQLite through `await import(...)`
 * behind a web guard, and reasonably assumed that was enough. Metro resolves dynamic
 * imports at build time like any other, so `expo-sqlite` landed in the web graph anyway —
 * and its web implementation imports `wa-sqlite.wasm`, which is neither in this project's
 * `assetExts` nor present in the package. The whole web bundle failed to build.
 *
 * Found 2026-08-18, the first day anything imported the container. The guard had been
 * correct and untested for as long as nothing reached it, which is the shape this class of
 * bug always has.
 *
 * Metro prefers `.web.ts` over `.ts` when bundling for web, so this file is what the web
 * graph resolves and `expo-sqlite` is never traversed. `docs/06` runs the entire Playwright
 * suite against the Expo web build, so a web bundle that cannot build is not a small
 * problem hiding in a dev-only corner.
 *
 * Throwing rather than returning a stub: on web the container picks `JsonContentSource`
 * and never calls this. If that ever stops being true, a thrown error naming the reason is
 * findable, and a fake database that answered queries with nothing would not be.
 */

import type {ContentDatabase} from './sqlite-content-source';

export async function openContentDatabase(): Promise<ContentDatabase> {
  throw new Error(
    'No SQLite on web. The web build reads content through JsonContentSource — see src/composition/container.ts.',
  );
}
