/**
 * @fileoverview The two playback speeds, tested against a recording fake player.
 *
 * Phases are marked per `docs/11-testing-conventions.md`. The constant guard below has
 * no act phase and so carries Given and Then only — a marker for a phase that does not
 * happen would be a lie about what the test does.
 */

import {describe, expect, it} from 'vitest';

import {NATURAL_PLAYBACK_RATE, SLOW_PLAYBACK_RATE} from '../../domain/audio';
import {playAtNaturalSpeed, playSlowly, type RateControllablePlayer} from './playback-rate';

/** Records what was asked of it, standing in for the native player. */
function makePlayer() {
  const calls: {rate: number; quality?: string}[] = [];
  const player: RateControllablePlayer = {
    shouldCorrectPitch: false,
    setPlaybackRate(rate, quality) {
      calls.push({rate, quality});
    },
  };
  return {player, calls};
}

describe('playSlowly', () => {
  it('slows the clip without letting the voice drop in pitch', () => {
    // Given
    const {player, calls} = makePlayer();

    // When
    playSlowly(player);

    // Then
    expect(calls).toEqual([{rate: SLOW_PLAYBACK_RATE, quality: 'high'}]);
    expect(player.shouldCorrectPitch).toBe(true);
  });

  it('stays clearly slower than speech but well above half speed', () => {
    // Half speed smears vowels enough to change what a learner hears, and anything
    // above about 0.8 is not perceptibly slower. This asserts the decision, so moving
    // the constant is a deliberate act.

    // Given
    const rate = SLOW_PLAYBACK_RATE;

    // Then
    expect(rate).toBeGreaterThan(0.5);
    expect(rate).toBeLessThan(0.8);
  });
});

describe('playAtNaturalSpeed', () => {
  it('returns the player to the speed the recording was made at', () => {
    // Given
    const {player, calls} = makePlayer();

    // When
    playSlowly(player);
    playAtNaturalSpeed(player);

    // Then
    expect(calls.at(-1)).toEqual({rate: NATURAL_PLAYBACK_RATE, quality: 'high'});
    expect(NATURAL_PLAYBACK_RATE).toBe(1);
  });
});
