/**
 * @fileoverview Playing a recording back more slowly.
 *
 * There is one recording per item. The slower reading a learner can ask for is
 * that same clip at a reduced rate with pitch correction, not a second file.
 *
 * This is a content decision as much as a playback one (2026-08-17). It removed
 * 587 human recordings from the critical path the whole project waits on, and
 * it removes the class of bug where a word and its slow reading disagree
 * because they were recorded weeks apart.
 *
 * The two rates live in `src/domain/audio` rather than here, because `AudioButton`
 * prints the slow rate on its badge and cannot reach into infra. One number, so the
 * control cannot promise a speed this module does not deliver.
 *
 * What rate change cannot do is put a pause *between* syllables, which a human
 * slow reading does naturally. For a single Tibetan syllable that costs
 * nothing. On the longest phrases it is a real difference, and the content
 * schema still has room for a genuine slow file if the native review ever asks
 * for one.
 */

import type {PitchCorrectionQuality} from 'expo-audio';

import {NATURAL_PLAYBACK_RATE, SLOW_PLAYBACK_RATE} from '../../domain/audio';

/**
 * Pitch correction quality.
 *
 * Without correction, a slowed voice drops in pitch and stops being a model of
 * how the word sounds — which is the only reason the control exists.
 */
const PITCH_CORRECTION_QUALITY: PitchCorrectionQuality = 'high';

/**
 * The part of an audio player this module drives.
 *
 * Declared structurally rather than importing `AudioPlayer`, so the rate rules
 * can be tested without a native module. `expo-audio`'s player satisfies it.
 */
export type RateControllablePlayer = {
  shouldCorrectPitch: boolean;
  setPlaybackRate(rate: number, pitchCorrectionQuality?: PitchCorrectionQuality): void;
};

/**
 * Plays the clip slowly enough to pick apart, still pitched like a voice.
 *
 * @example
 * playSlowly(player);
 * // player now runs at 0.65x with pitch correction
 */
export function playSlowly(player: RateControllablePlayer): void {
  player.shouldCorrectPitch = true;
  player.setPlaybackRate(SLOW_PLAYBACK_RATE, PITCH_CORRECTION_QUALITY);
}

/** Returns the player to the speed the recording was made at. */
export function playAtNaturalSpeed(player: RateControllablePlayer): void {
  player.shouldCorrectPitch = true;
  player.setPlaybackRate(NATURAL_PLAYBACK_RATE, PITCH_CORRECTION_QUALITY);
}
