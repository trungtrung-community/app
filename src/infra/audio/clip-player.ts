/**
 * @fileoverview Playing one teaching clip at a time.
 *
 * Distinct from the cue player, and the line is docs/07's: teaching audio is content,
 * cues are interface. A cue is a fixed table of four preloaded ticks gated by P2's
 * switches; a teaching clip is whichever of 2,004 recordings the learner just asked to
 * hear, and it may one day arrive from a server. The two share an audio session and
 * nothing else.
 *
 * One clip at a time is the model-take rule: a learner comparing their own voice to the
 * recording, or replaying a prompt, means the previous take must stop — two overlapping
 * voices teach nothing. So `play` always silences what came before it.
 *
 * Failure is silence, the same trade `cue()` makes. A missing or unplayable clip must
 * read as "no audio", never as an interrupted exercise.
 *
 * `expo-audio` is reached by dynamic import for the reason `createDeviceCuePlayer` gives:
 * a module that names the engine at the top makes every test file pay to load it.
 */

import type {AudioPlayer} from 'expo-audio';

import {playAtNaturalSpeed, playSlowly} from './playback-rate';

/**
 * The two speeds a clip can play at. There is no third: slow is the same take at
 * 0.65× with pitch correction, never a second recording (docs/07, 2026-08-17).
 */
export type ClipRate = 'natural' | 'slow';

export type ClipPlayOptions = {
  /** Defaults to 'natural' — the speed the recording was made at. */
  rate?: ClipRate;
};

export type ClipPlayer = {
  /**
   * Start the clip, stopping whichever one was playing.
   *
   * Resolves once playback has started — or immediately when it cannot, because a
   * clip that fails to play is silence, not an error the caller must handle.
   */
  play(source: {uri: string}, options?: ClipPlayOptions): Promise<void>;
  /** Stop the current clip. Harmless when nothing is playing. */
  stop(): Promise<void>;
  /** Free the native player. For unmount; a later `play` starts fresh. */
  release(): Promise<void>;
};

/**
 * A player for teaching clips.
 *
 * @example
 * const player = createClipPlayer();
 * await player.play({uri}, {rate: 'slow'});
 */
export function createClipPlayer(): ClipPlayer {
  let current: AudioPlayer | null = null;

  /** Stop and free the current player, surviving one that is already torn down. */
  function discard(): void {
    const previous = current;
    current = null;
    if (previous === null) {
      return;
    }
    try {
      previous.remove();
    } catch {
      // Already released by the engine — which is the state discard wanted anyway.
    }
  }

  return {
    async play(source, options) {
      try {
        const {createAudioPlayer} = await import('expo-audio');
        discard();
        const player = createAudioPlayer(source);
        if (options?.rate === 'slow') {
          playSlowly(player);
        } else {
          playAtNaturalSpeed(player);
        }
        player.play();
        current = player;
      } catch {
        // Silence, never a crash — the cue player's rule, kept for the same reason.
      }
    },

    async stop() {
      try {
        current?.pause();
      } catch {
        // A player torn down mid-stop was already stopped.
      }
    },

    async release() {
      discard();
    },
  };
}
