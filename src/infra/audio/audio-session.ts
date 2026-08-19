/**
 * @fileoverview The one audio session, settled once.
 *
 * `setAudioModeAsync` configures the **app**, not a player. Teaching recordings and
 * interface cues therefore share a single policy whether or not anyone decides one, which
 * is why it is decided here rather than discovered mid-lesson. Recorded in `docs/07`,
 * 2026-08-18.
 *
 * `playsInSilentMode: true` — **a listening app cannot go quiet on the ring switch.**
 * Every exercise in the Speak track is a recording; a learner who flips the switch on a
 * bus and gets a silent lesson has a broken app, not a quiet one. The cost is that
 * interface sounds also play with the ringer off, and that cost was accepted with its
 * answer already in place: P2's sound row turns the cues off, which is exactly what the
 * 2026-08-16 decision says that row is for. iOS offers no reliable read of the switch, so
 * there is no third option where cues alone respect it.
 *
 * `interruptionMode: 'mixWithOthers'` — what `expo-audio` documents for short UI clips,
 * and it does not stop a learner's music. **Open**: whether the lesson player wants
 * `duckOthers` when it lands, since a word spoken over a podcast is not a word heard. The
 * mode can be set again at any time, so that is a change to one call, not to a design.
 */

import {setAudioModeAsync} from 'expo-audio';

/**
 * Apply the app's audio policy. Call once, at start-up.
 *
 * Resolves either way. A device that refuses the session still has to run the app: the
 * consequence is that audio behaves however the platform defaults, which is a degraded
 * lesson and not a crashed one.
 */
export async function configureAudioSession(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
      // Flipped by the record-compare flow when it lands, and back afterwards: on iOS a
      // session that allows recording drops playback volume for as long as it is set.
      allowsRecording: false,
    });
  } catch {
    // Deliberately swallowed. There is nothing a learner could do about it and nothing
    // the app should say — E7's background transport is where a real failure would show.
  }
}
