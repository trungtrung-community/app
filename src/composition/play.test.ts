/**
 * @fileoverview `playClip` resolves before it plays, and a null resolution is silence.
 *
 * The container's `audio` slot is overridden with a source double, the way
 * `progress.test.ts` overrides its store. `expo-audio` is mocked at the module seam so
 * the second half of the contract is assertable: when this build has no clip for the
 * id, the engine is never even touched — which is exactly what shipping against the
 * stubbed `BundledAudioSource` relies on.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {AudioId, AudioSource} from '../ports/audio-source';
import type {AudioRef} from '../ports/content-ids';

import {SLOW_PLAYBACK_RATE} from '../domain/audio';

import {override, resetContainer} from './container';
import {playClip, stopClip} from './play';

const engine = vi.hoisted(() => {
  class FakeAudioPlayer {
    playing = false;
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

/** A source with real takes for some ids and nothing for the rest. */
function fakeSource(takes: Record<string, string>): AudioSource {
  return {
    async resolve(id: AudioId) {
      const uri = takes[id];
      return uri === undefined ? null : {uri};
    },
    async isAvailable() {
      return Object.keys(takes).length > 0;
    },
  };
}

const WORD: AudioRef = {path: 'audio/natural/tashi-delek.m4a', available: true};

beforeEach(() => {
  engine.players.length = 0;
  engine.createAudioPlayer.mockClear();
  resetContainer();
});

describe('playClip', () => {
  it('hands the resolved uri to the player, not the content path', async () => {
    // Given
    override('audio', fakeSource({[WORD.path]: 'file:///bundle/tashi-delek.m4a'}));

    // When
    await playClip(WORD);

    // Then
    expect(engine.createAudioPlayer).toHaveBeenCalledWith({uri: 'file:///bundle/tashi-delek.m4a'});
    expect(engine.players[0]?.playing).toBe(true);
  });

  it('carries the slow rate through to the take', async () => {
    // Given
    override('audio', fakeSource({[WORD.path]: 'file:///bundle/tashi-delek.m4a'}));

    // When
    await playClip(WORD, {rate: 'slow'});

    // Then
    expect(engine.players[0]?.rate).toBe(SLOW_PLAYBACK_RATE);
  });

  it('is silence when the build has no take, without touching the engine', async () => {
    // Given
    override('audio', fakeSource({}));

    // When
    await playClip(WORD);

    // Then
    expect(engine.createAudioPlayer).not.toHaveBeenCalled();
  });

  it('resolves as silence when the source itself fails', async () => {
    // Given
    override('audio', {
      async resolve() {
        throw new Error('manifest unreadable');
      },
      async isAvailable() {
        return false;
      },
    });

    // Then
    await expect(playClip(WORD)).resolves.toBeUndefined();
    expect(engine.createAudioPlayer).not.toHaveBeenCalled();
  });
});

describe('stopClip', () => {
  it('stops the clip that is playing', async () => {
    // Given
    override('audio', fakeSource({[WORD.path]: 'file:///bundle/tashi-delek.m4a'}));
    await playClip(WORD);

    // When
    await stopClip();

    // Then
    expect(engine.players[0]?.playing).toBe(false);
  });

  it('never constructs a player just to stop it', async () => {
    // When
    await stopClip();

    // Then
    expect(engine.createAudioPlayer).not.toHaveBeenCalled();
  });
});
