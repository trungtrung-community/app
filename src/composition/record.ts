/**
 * @fileoverview The record-compare seam — one take at a time, gone after the compare.
 *
 * `play.ts`'s shape, for the learner's own voice: one module-level recorder and
 * one module-level player for takes, reached through the composition layer so no
 * renderer ever names `expo-audio`, a file system, or an adapter. The renderer
 * consumes these helpers as its state machine's edges: start, stop, play back,
 * discard.
 *
 * Ephemerality is enforced here and in the renderer together: `discardTake` is
 * the only exit from a compare — Again, Got it, and abandoning the exercise all
 * pass through it — so a take never outlives the screen that recorded it
 * (docs/01, M1's privacy sentence).
 *
 * The mic-primer bookkeeping also lives on this seam because it belongs to the
 * same flow: M1 runs exactly once, before the system dialog ever appears, and
 * `AppStateStore` is where "shown once" survives a restart.
 *
 * Component tests mock this module at its seam, the way screens mock
 * `expo-router` — there is no container key for the recorder because nothing
 * else in the app records.
 */

import {createClipPlayer, type ClipPlayer} from '../infra/audio/clip-player';
import {
  createTakeRecorder,
  type MicPermission,
  type TakeRecorder,
} from '../infra/audio/take-recorder';

import {appState} from './container';

/**
 * Re-exported so renderers can name the states without importing `src/infra/**`,
 * which eslint refuses — the same door `play.ts` opens for `ClipPlayOptions`.
 */
export type {MicPermission} from '../infra/audio/take-recorder';

let recorder: TakeRecorder | null = null;
let takePlayer: ClipPlayer | null = null;

/** Created on first use, not on import — `play.ts`'s rule, kept for the same reason. */
function takeRecorder(): TakeRecorder {
  recorder ??= createTakeRecorder();
  return recorder;
}

function player(): ClipPlayer {
  takePlayer ??= createClipPlayer();
  return takePlayer;
}

/** What the platform says about the microphone, without asking the learner. */
export async function queryMicPermission(): Promise<MicPermission> {
  return takeRecorder().queryPermission();
}

/** Raise the system dialog. The M1 primer must have run before this. */
export async function requestMicPermission(): Promise<MicPermission> {
  return takeRecorder().requestPermission();
}

/**
 * Begin capturing a take. `'unavailable'` is M3's state — the hardware or the
 * session refused, and the exercise carries on without a recording.
 */
export async function startTake(): Promise<'recording' | 'unavailable'> {
  const started = await takeRecorder().start();
  return started.ok ? 'recording' : 'unavailable';
}

/** End the take. The cache file's URI, or null when the take was lost. */
export async function stopTake(): Promise<string | null> {
  const stopped = await takeRecorder().stop();
  return stopped.ok ? stopped.uri : null;
}

/**
 * Delete a take. The only exit from a compare: Again, Got it, and leaving the
 * exercise all discard, which is what keeps a recording ephemeral.
 */
export async function discardTake(uri: string): Promise<void> {
  await player()
    .stop()
    .catch(() => {});
  await takeRecorder().deleteTake(uri);
}

/** Play the learner's own take, stopping whichever one was playing. */
export async function playTake(uri: string): Promise<void> {
  try {
    await player().play({uri});
  } catch {
    // A take that cannot play is silence — `play.ts` states the trade.
  }
}

/** Stop the take mid-playback, for screens leaving. A no-op when nothing played. */
export async function stopTakePlayback(): Promise<void> {
  await takePlayer?.stop();
}

/** Whether M1 has already run on this device. */
export async function micPrimerSeen(): Promise<boolean> {
  try {
    const store = await appState();
    return (await store.load()).micPrimerSeen;
  } catch {
    // A device that cannot remember shows the primer again, which only repeats
    // one screen — the safe direction.
    return false;
  }
}

/** Record that M1 ran, so it never runs again. */
export async function markMicPrimerSeen(): Promise<void> {
  try {
    const store = await appState();
    const current = await store.load();
    await store.save({...current, micPrimerSeen: true});
  } catch {
    // Losing this fact repeats a primer, never a lesson.
  }
}
