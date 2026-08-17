/**
 * @fileoverview How fast a recording plays, and what to call it.
 *
 * There is one recording per item. The slower reading a learner can ask for is that same
 * clip at a reduced rate with pitch correction, not a second file — a content decision
 * taken 2026-08-17 that removed 587 recordings from the critical path.
 *
 * The rate lives here rather than beside the player because two layers need to agree on
 * it: the player sets it, and `AudioButton` prints it on the slow control's badge. Kept in
 * one place they cannot disagree; kept in two, the button eventually promises a speed the
 * player does not deliver — which is exactly what happened when the badge was ported from
 * the board as a literal `½×`.
 *
 * Only the numbers and the label are here. Applying them touches an `expo-audio` player,
 * which is a platform concern and lives in `src/infra/audio`.
 */

/**
 * The rate the slow control plays at.
 *
 * Not half speed. Half is what `expo-audio` documents as "slow motion", and on speech it
 * smears vowels badly enough to change what a learner hears — which defeats the only
 * reason the control exists. This is clearly slower while still sounding like someone
 * talking.
 */
export const SLOW_PLAYBACK_RATE = 0.65;

/** Ordinary playback: the speed the recording was made at. */
export const NATURAL_PLAYBACK_RATE = 1;

/**
 * What the slow control's badge reads.
 *
 * Derived from the rate rather than written out, so the badge cannot drift from what the
 * player actually does. Change the rate and the badge follows.
 */
export const SLOW_RATE_LABEL = `${SLOW_PLAYBACK_RATE}×`;
