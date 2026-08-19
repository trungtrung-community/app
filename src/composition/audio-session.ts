/**
 * @fileoverview The audio policy, reachable from a route.
 *
 * `app/` may not import `src/infra/**` — eslint refuses it, because naming a concrete
 * adapter in a screen is what turns a swap into a rewrite. The session is not an adapter
 * behind a port, so it has no container accessor; this is the door it gets instead.
 *
 * A pass-through, and worth the file: the alternative is either a lint exception in the
 * root layout or an audio policy hidden inside whichever adapter happened to need it
 * first — and the policy governs teaching recordings and interface cues alike, so it
 * belongs to neither.
 */

export {configureAudioSession} from '../infra/audio/audio-session';
