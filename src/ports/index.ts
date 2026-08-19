/**
 * @fileoverview The three ports, and the reasoning for there being three.
 *
 * These are the only places the app touches something outside itself, so they are
 * the only interfaces a future backend has to satisfy. A repository per entity
 * would double the wiring for nothing: content lives in one medium with one
 * lifecycle, so lessons and vocabulary would always migrate together.
 *
 * **Every method is async, even though MMKV and a bundled database are both
 * synchronous.** This is the one decision that makes a later migration local
 * rather than sweeping. A synchronous `ContentSource` would put a synchronous call
 * in every use case, and going remote would then mean editing all of them.
 *
 * What the seam actually buys differs per port, and it is worth being honest about
 * it rather than claiming a one-line migration:
 *
 * - `AudioSource` is genuinely small to move: a remote adapter plus a caching
 *   decorator, and nothing above it changes. It is also the one most likely to
 *   move, because audio is what pushes the bundle past what a store will ship.
 * - `ContentSource` is contained: a new adapter, runtime validation at the
 *   boundary, and a fetch and cache policy.
 * - `ProgressStore` is a subsystem, not an adapter. Accounts bring authentication,
 *   sync semantics, conflict resolution, an offline write queue, schema versioning
 *   and migration of existing local data. The seam decides where that lands; it
 *   does not make it cheap.
 *
 * **`CuePlayer` joined them on 2026-08-18 and does not answer that question at all** — it
 * will never go remote. Its reasons are platform isolation and a single gate for P2's
 * off-switch, stated in its own file. It is named here rather than quietly added so that
 * the paragraph above keeps meaning what it says: three of these are about migration, and
 * the fourth is not.
 */

export type {AudioSource} from './audio-source';
export type {CuePlayer} from './cue-player';
export type {ProgressStore} from './progress-store';
export type {SettingsStore} from './settings-store';

/**
 * `ContentSource` is one wired port and six capabilities.
 *
 * The container constructs one content adapter, because content lives in one medium
 * with one lifecycle. A caller should still take only the capability it uses — a use
 * case that walks a stop needs `WalkSource`, not the other fifteen methods — so the
 * narrower types are exported beside the whole.
 */
export type {
  CollectionSource,
  ContentCatalog,
  ContentSource,
  DictionarySource,
  ExerciseSource,
  ScriptReferenceSource,
  WalkSource,
} from './content-source';
