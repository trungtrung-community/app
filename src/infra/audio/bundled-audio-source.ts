/**
 * @fileoverview Audio from the app bundle.
 *
 * A deliberate stub. No recordings exist in the repo yet — `01-vision.md` requires
 * every word, phrase and syllable a learner imitates to be a human recording, and
 * that work has not started.
 *
 * `isAvailable()` returning false is not a placeholder: the product has a real
 * audio-free mode, and `docs/01` requires limitations to be stated plainly rather
 * than hidden. A build with no clips should say so.
 */

import type {AudioId, AudioSource} from '../../ports/audio-source';

export class BundledAudioSource implements AudioSource {
  async resolve(_id: AudioId): Promise<{uri: string} | null> {
    return null;
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }
}
