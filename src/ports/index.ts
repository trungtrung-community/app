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
 */

export type {AudioSource} from './audio-source';
export type {ContentSource} from './content-source';
export type {ProgressStore} from './progress-store';
