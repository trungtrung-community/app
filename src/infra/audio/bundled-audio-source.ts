/**
 * @fileoverview Audio from the app bundle.
 *
 * Still a deliberate stub. The tool that produces the recordings exists as of
 * 2026-08-17 — `trungtrung-community/studio` — and the pipeline that carries them
 * here is complete: it imports a checksummed bundle, merges each path onto its
 * record, and compiles it into `audio_natural`. What has not happened yet is the
 * recording. 2,004 takes, one voice.
 *
 * `isAvailable()` returning false is not a placeholder: the product has a real
 * audio-free mode, and `docs/01` requires limitations to be stated plainly rather
 * than hidden. A build with no clips should say so.
 *
 * **How clips reach the bundle is still open, and should stay open until there
 * are clips.** React Native cannot require an asset by a name computed at
 * runtime, so bundling needs a generated map of every id to a static require.
 * That is roughly 70 MB against a 200 MB store cap, which is exactly why
 * `AudioSource` is the narrowest of the three ports — see its own overview. The
 * choice between bundling and fetching should be made against real files, not
 * ahead of them.
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
