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
    const {player, calls} = makePlayer();

    playSlowly(player);

    expect(calls).toEqual([{rate: SLOW_PLAYBACK_RATE, quality: 'high'}]);
    expect(player.shouldCorrectPitch).toBe(true);
  });

  it('stays clearly slower than speech but well above half speed', () => {
    // Half speed smears vowels enough to change what a learner hears, and
    // anything above about 0.8 is not perceptibly slower. This asserts the
    // decision, so moving the constant is a deliberate act.
    expect(SLOW_PLAYBACK_RATE).toBeGreaterThan(0.5);
    expect(SLOW_PLAYBACK_RATE).toBeLessThan(0.8);
  });
});

describe('playAtNaturalSpeed', () => {
  it('returns the player to the speed the recording was made at', () => {
    const {player, calls} = makePlayer();

    playSlowly(player);
    playAtNaturalSpeed(player);

    expect(calls.at(-1)).toEqual({rate: NATURAL_PLAYBACK_RATE, quality: 'high'});
    expect(NATURAL_PLAYBACK_RATE).toBe(1);
  });
});
