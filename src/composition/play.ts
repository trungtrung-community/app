/**
 * @fileoverview `playClip(item.audio)` — teaching audio, from anywhere in the app.
 *
 * The shape is `cue.ts`'s: one module-level player, reached through the composition
 * layer so no screen ever names `expo-audio` or an adapter. The difference is the
 * subject — a cue is interface, a clip is content — so this one resolves through the
 * container's `AudioSource` before anything plays.
 *
 * Today every resolution returns null, because `BundledAudioSource` is a deliberate
 * stub: the recording of 2,004 takes has not happened. That makes `playClip` a no-op,
 * and the no-op is correct — there is nothing to play. Consumers (the record-compare
 * model take, hear-it-find-it prompts, replay buttons) can call it unconditionally
 * now; it becomes live the day the source stops being a stub, with no caller changing.
 */

import type {AudioId} from '../ports/audio-source';
import type {AudioRef} from '../ports/content-ids';

import {createClipPlayer, type ClipPlayOptions, type ClipPlayer} from '../infra/audio/clip-player';

import {audio} from './container';

/**
 * Re-exported so `app/` consumers can name the options without importing
 * `src/infra/**`, which eslint refuses — the same door `cue.ts` opens for `CLIPS`.
 */
export type {ClipPlayOptions, ClipRate} from '../infra/audio/clip-player';

let player: ClipPlayer | null = null;

/** Created on first play, not on import — nothing should pay for audio it never asks for. */
function clipPlayer(): ClipPlayer {
  player ??= createClipPlayer();
  return player;
}

/**
 * Play an item's recording, stopping whichever clip was playing.
 *
 * Takes the item's `AudioRef` rather than a bare path, because that is what content
 * hands a screen. `available` is not consulted here: it exists to hide the listen
 * control, and the source's `resolve` stays the one authority on what this build can
 * play — null means silence, never a crash.
 *
 * Resolves when playback has started, or immediately when there is nothing to play.
 *
 * @example void playClip(word.audio);
 * @example await playClip(word.audio, {rate: 'slow'});
 */
export async function playClip(ref: AudioRef, options?: ClipPlayOptions): Promise<void> {
  try {
    const source = await audio();
    // The path is minted by the content build from the item's identity, and it is
    // exactly what the audio manifest keys takes by — so it is the id the source
    // resolves. This seam is where the brand is applied.
    const clip = await source.resolve(ref.path as AudioId);
    if (clip === null) {
      return;
    }
    await clipPlayer().play(clip, options);
  } catch {
    // A clip that cannot play is silence — `cue.ts` states the trade.
  }
}

/**
 * Stop the current clip, for screens leaving mid-playback.
 *
 * A no-op when nothing ever played; it will not construct a player just to stop it.
 */
export async function stopClip(): Promise<void> {
  await player?.stop();
}
