/**
 * @fileoverview The device adapter's rules, tested against fakes.
 *
 * Fakes rather than mocks, following `mmkv-progress-store.test.ts`: two objects that
 * record what they were asked to do, so the assertions are about what the learner would
 * hear and feel rather than about which method was called. Both interfaces are two
 * members wide, which is what makes that cheap.
 *
 * What is **not** covered is `createDeviceCuePlayer` — the factory that attaches
 * `expo-audio` and `expo-haptics`. That is native-module wiring with no branches in it,
 * and `docs/06` puts real playback and real haptics in the Maestro smoke pass, on a
 * device, where they can actually be judged.
 *
 * The `beforeEach` is the shared Given — a player with both switches at their defaults —
 * so a test that adds no setup starts at `// When`.
 */

import {beforeEach, describe, expect, it} from 'vitest';

import type {Cue} from '../../domain/cue';

import {DeviceCuePlayer, type CueHaptics, type CueSound} from './device-cue-player';

class FakeSound implements CueSound {
  plays = 0;
  volume: number | null = null;

  replay(): void {
    this.plays += 1;
  }

  setVolume(gain: number): void {
    this.volume = gain;
  }
}

class FakeHaptics implements CueHaptics {
  ticks = 0;

  tick(): void {
    this.ticks += 1;
  }
}

let correct: FakeSound;
let wrong: FakeSound;
let haptics: FakeHaptics;
let player: DeviceCuePlayer;

beforeEach(() => {
  correct = new FakeSound();
  wrong = new FakeSound();
  haptics = new FakeHaptics();
  player = new DeviceCuePlayer({correct, wrong}, haptics);
});

describe('play', () => {
  it('sounds the clip and ticks for a correct answer', async () => {
    // When
    await player.play('correct');

    // Then
    expect(correct.plays).toBe(1);
    expect(haptics.ticks).toBe(1);
  });

  it('sounds a wrong answer without moving the phone', async () => {
    // When
    await player.play('wrong');

    // Then
    expect(wrong.plays).toBe(1);
    expect(haptics.ticks).toBe(0);
  });

  it('stays silent for a cue with no clip rather than throwing', async () => {
    // When
    await player.play('run');

    // Then
    expect(correct.plays).toBe(0);
    expect(wrong.plays).toBe(0);
  });

  it('sounds twice when fired twice, rather than ignoring the second', async () => {
    // When
    await player.play('correct');
    await player.play('correct');

    // Then
    expect(correct.plays).toBe(2);
  });
});

describe('preferences', () => {
  it('keeps the tick when sound is off', async () => {
    // Given
    await player.setPreferences({sound: false, haptics: true});

    // When
    await player.play('correct');

    // Then
    expect(correct.plays).toBe(0);
    expect(haptics.ticks).toBe(1);
  });

  it('keeps the sound when vibration is off', async () => {
    // Given
    await player.setPreferences({sound: true, haptics: false});

    // When
    await player.play('correct');

    // Then
    expect(correct.plays).toBe(1);
    expect(haptics.ticks).toBe(0);
  });

  it('does nothing at all with both switches off', async () => {
    // Given
    await player.setPreferences({sound: false, haptics: false});

    // When
    for (const name of ['correct', 'wrong'] as Cue[]) {
      await player.play(name);
    }

    // Then
    expect(correct.plays + wrong.plays + haptics.ticks).toBe(0);
  });
});

describe('setGain', () => {
  it('reaches the clip so the testbed can tune it', () => {
    // When
    player.setGain('correct', 0.42);

    // Then
    expect(correct.volume).toBe(0.42);
  });
});
