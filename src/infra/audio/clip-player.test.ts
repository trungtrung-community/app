/**
 * @fileoverview The clip player's rules, against a mocked engine.
 *
 * `expo-audio` is mocked at the module seam rather than faked behind an interface,
 * because unlike `DeviceCuePlayer` this adapter has no port between itself and the
 * engine — its whole job is to drive `createAudioPlayer` correctly. The fake records
 * what the engine was asked, so the assertions are about what the learner would hear:
 * which take, at what speed, and that a second take silences the first.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {NATURAL_PLAYBACK_RATE, SLOW_PLAYBACK_RATE} from '../../domain/audio';

import {createClipPlayer, type ClipPlayer} from './clip-player';

const engine = vi.hoisted(() => {
  class FakeAudioPlayer {
    playing = false;
    removed = false;
    rate: number | null = null;
    shouldCorrectPitch = false;

    constructor(readonly source: unknown) {}

    play(): void {
      this.playing = true;
    }

    pause(): void {
      this.playing = false;
    }

    remove(): void {
      this.removed = true;
      this.playing = false;
    }

    setPlaybackRate(rate: number): void {
      this.rate = rate;
    }
  }

  const players: FakeAudioPlayer[] = [];
  return {
    players,
    createAudioPlayer: vi.fn((source: unknown) => {
      const created = new FakeAudioPlayer(source);
      players.push(created);
      return created;
    }),
  };
});

vi.mock('expo-audio', () => ({createAudioPlayer: engine.createAudioPlayer}));

let player: ClipPlayer;

beforeEach(() => {
  engine.players.length = 0;
  engine.createAudioPlayer.mockClear();
  player = createClipPlayer();
});

describe('play', () => {
  it('starts the take it was handed', async () => {
    // When
    await player.play({uri: 'file:///takes/tashi-delek.m4a'});

    // Then
    expect(engine.createAudioPlayer).toHaveBeenCalledWith({uri: 'file:///takes/tashi-delek.m4a'});
    expect(engine.players[0]?.playing).toBe(true);
  });

  it('runs at the recorded speed unless asked otherwise', async () => {
    // When
    await player.play({uri: 'file:///takes/word.m4a'});

    // Then
    expect(engine.players[0]?.rate).toBe(NATURAL_PLAYBACK_RATE);
    expect(engine.players[0]?.shouldCorrectPitch).toBe(true);
  });

  it('slows the same take with pitch correction rather than wanting a second recording', async () => {
    // When
    await player.play({uri: 'file:///takes/word.m4a'}, {rate: 'slow'});

    // Then
    expect(engine.players[0]?.rate).toBe(SLOW_PLAYBACK_RATE);
    expect(engine.players[0]?.shouldCorrectPitch).toBe(true);
  });

  it('silences the first take when a second starts, so two voices never overlap', async () => {
    // Given
    await player.play({uri: 'file:///takes/first.m4a'});

    // When
    await player.play({uri: 'file:///takes/second.m4a'});

    // Then
    expect(engine.players[0]?.removed).toBe(true);
    expect(engine.players[1]?.playing).toBe(true);
  });

  it('resolves as silence when the engine refuses, never as a crash', async () => {
    // Given
    engine.createAudioPlayer.mockImplementationOnce(() => {
      throw new Error('no decoder for this format');
    });

    // Then
    await expect(player.play({uri: 'file:///takes/broken.m4a'})).resolves.toBeUndefined();
  });

  it('recovers after a refusal instead of staying silent', async () => {
    // Given
    engine.createAudioPlayer.mockImplementationOnce(() => {
      throw new Error('no decoder for this format');
    });
    await player.play({uri: 'file:///takes/broken.m4a'});

    // When
    await player.play({uri: 'file:///takes/fine.m4a'});

    // Then
    expect(engine.players.at(-1)?.playing).toBe(true);
  });
});

describe('stop', () => {
  it('pauses the clip mid-play', async () => {
    // Given
    await player.play({uri: 'file:///takes/word.m4a'});

    // When
    await player.stop();

    // Then
    expect(engine.players[0]?.playing).toBe(false);
  });

  it('is harmless when nothing ever played', async () => {
    // Then
    await expect(player.stop()).resolves.toBeUndefined();
  });
});

describe('release', () => {
  it('frees the native player', async () => {
    // Given
    await player.play({uri: 'file:///takes/word.m4a'});

    // When
    await player.release();

    // Then
    expect(engine.players[0]?.removed).toBe(true);
  });

  it('leaves the player usable for a later play', async () => {
    // Given
    await player.play({uri: 'file:///takes/word.m4a'});
    await player.release();

    // When
    await player.play({uri: 'file:///takes/again.m4a'});

    // Then
    expect(engine.players.at(-1)?.playing).toBe(true);
  });
});
