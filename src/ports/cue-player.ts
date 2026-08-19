/**
 * @fileoverview Marking a moment with a sound and a tick.
 *
 * The fourth port, and the one whose justification differs from the other three.
 * `docs/architecture.md` frames `AudioSource`, `ContentSource` and `ProgressStore` around
 * what it would cost each to go remote. **This one will never go remote.** It is here for
 * two other reasons, both of which pay today rather than later:
 *
 * - **Platform isolation.** `expo-haptics` throws on web and does nothing under Vitest.
 *   Without a seam, every component that marks a moment would carry a `Platform.OS`
 *   check, and the fifty-first would be the one that forgot.
 * - **One gate for the off-switch.** `docs/07` says P2's sound row turns interface sounds
 *   off. If preferences were consulted at call sites, that promise would be as good as
 *   the least careful call site. Here it is a property of the thing that plays.
 *
 * Deliberately narrower than `AudioSource`, which resolves an id to a URI and plays
 * nothing. A cue has no id to resolve — the four are fixed and their files ship — so this
 * port plays and does not resolve. The two do not overlap.
 */

import type {Cue, CuePreferences} from '../domain/cue';

export type CuePlayer = {
  /**
   * Mark a moment.
   *
   * Resolves when the cue has been *started*, not when it has finished — a caller waiting
   * for a 1.4 s celebration to end before advancing would be a bug, and the signature
   * should not invite it.
   *
   * Async for the reason in `./index`: every port method is, so that nothing above has to
   * change if the implementation ever stops being immediate.
   */
  play(cue: Cue): Promise<void>;
  /**
   * Apply the learner's switches.
   *
   * Set, not read: P2 owns the values and this is told about them. A getter here would
   * make two places able to answer the same question.
   */
  setPreferences(preferences: CuePreferences): Promise<void>;
};
