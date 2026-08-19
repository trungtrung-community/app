/**
 * @fileoverview `cue('correct')` — the whole call site, everywhere in the app.
 *
 * A screen marking a moment should not be `await`ing anything, holding a player, or
 * knowing that a tick and a sound are two different subsystems. Every one of those is a
 * chance for a lesson to be blocked by a 40 ms noise.
 *
 * So this is deliberately the narrowest thing that works: **synchronous, returns nothing,
 * and cannot fail.** A cue that does not play is silence. A cue that throws would be a
 * missing sound *and* an interrupted exercise, which is the trade nobody would choose if
 * asked.
 *
 * It lives in `src/composition/` rather than in `src/components/core/` because reaching
 * the container is exactly what this layer is for — `src/components/` answers "what does
 * this look like", and a sound has no appearance.
 */

import type {Cue, CuePreferences} from '../domain/cue';
import type {BoundCue} from '../infra/cues/clips';
import {DeviceCuePlayer} from '../infra/cues/device-cue-player';

import {cues} from './container';

/**
 * The bound cues and the gains they ship with.
 *
 * Re-exported because `app/` may not import `src/infra/**` and `/_ds/feel` needs a
 * starting point to adjust from — one that is the real table rather than a copy of it,
 * which would be a second set of numbers to keep in step.
 */
export {CLIPS as CUE_CLIPS, type BoundCue} from '../infra/cues/clips';

/**
 * Mark a moment. Fire and forget.
 *
 * @example cue('correct');
 * @example cue('stop-complete');
 */
export function cue(name: Cue): void {
  void cues()
    .then(player => player.play(name))
    .catch(() => {});
}

/**
 * Apply P2's sound and vibration switches.
 *
 * Awaitable, unlike `cue`: this one is a settings write, the learner is looking at the
 * control, and a failure there is worth knowing about.
 */
export async function setCuePreferences(preferences: CuePreferences): Promise<void> {
  const player = await cues();
  await player.setPreferences(preferences);
}

/**
 * Change a clip's volume at runtime. For `/_ds/feel`, and nothing else.
 *
 * Shipping code sets a gain once from `CLIPS` and never touches it again — the numbers in
 * that table are the answer, not a starting point. This exists because those numbers have
 * to be *decided* first, and deciding them means holding a phone and adjusting until a
 * tick sits under speech rather than on top of it. The alternative is a rebuild per
 * adjustment, which is how a gain table ends up being guessed once and never revisited.
 *
 * A no-op on any adapter that does not offer it, which is every adapter except the device
 * one. The `instanceof` is the honest form: the port does not carry this, deliberately.
 */
export async function setCueGain(cue: BoundCue, gain: number): Promise<void> {
  const player = await cues();
  if (player instanceof DeviceCuePlayer) {
    player.setGain(cue, gain);
  }
}
