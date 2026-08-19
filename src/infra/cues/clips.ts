/**
 * @fileoverview Which file a cue plays, and how loud.
 *
 * Deliberately **pure** — no `require()` of an asset here, which is what lets a plain
 * Vitest run in node check this table against the filesystem. The asset modules live next
 * door in `./sources`, which is six lines with nothing in it to get wrong except the
 * names, and `./clips.test.ts` reads that file as text to prove the two agree.
 *
 * `run` is absent, and that is the decision rather than an omission. `docs/07`
 * (2026-08-18): `notification.wav` is 1.60 s, which is far too long for a pill that says
 * `4 in a row`, and it is reserved for the local notification — a different mechanism
 * that does not come through this port at all. The run stays silent until a clip fits it.
 *
 * **Gains are tuned by ear on a device**, from `/_ds/feel`. Every clip is peak-normalised
 * to −1 dBFS by `scripts/build-sounds.ts`, so these numbers are comparable to each other:
 * a cue at 0.35 really is quieter than one at 0.5, which was not true of the source files
 * (they arrived between −5.0 and −16.8 dB).
 */

import type {Cue} from '../../domain/cue';

export type ClipSpec = {
  /** The basename in `assets/sounds/`, without its extension. */
  readonly file: string;
  /**
   * Playback volume, 0–1, straight onto the player.
   *
   * An interface sound must sit **under** speech: a learner turns the volume up to hear a
   * recording, and a tick at the same level as that recording is a shock.
   */
  readonly gain: number;
};

/**
 * The bound cues.
 *
 * `Partial` is load-bearing: a cue may exist in the vocabulary with no sound, and the
 * type says so rather than a comment saying so.
 */
export const CLIPS = {
  /** The one that fires most often, so the quietest. */
  correct: {file: 'correct_answer', gain: 0.35},
  /** Quieter still. A miss is information, and it should not be the loudest thing. */
  wrong: {file: 'wrong_answer', gain: 0.3},
  /** Once per stop, and the moment the product is built around. It may be heard. */
  'stop-complete': {file: 'celebration', gain: 0.5},
} as const satisfies Partial<Record<Cue, ClipSpec>>;

export type BoundCue = keyof typeof CLIPS;
