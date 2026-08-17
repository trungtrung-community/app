/**
 * @fileoverview Resolving an audio id to something playable.
 *
 * Deliberately the narrowest of the three ports: it hands back a URI and does not
 * play anything. Playback is a platform concern that belongs to the audio service,
 * and keeping resolution separate is what lets a caching decorator sit between
 * local and remote later without knowing about transport or lock-screen controls.
 *
 * No audio exists in the repo yet, so the only adapter is a stub. The port is
 * declared now because audio is the one thing near-certain to go remote: every
 * word, phrase and syllable is a human recording, and the Play Store caps a base
 * app bundle at roughly 200 MB.
 */

export type AudioId = string & {readonly __brand: 'AudioId'};

export type AudioSource = {
  /** A URI the player can open, or null when this build has no clip for the id. */
  resolve(id: AudioId): Promise<{uri: string} | null>;
  /** Whether any audio ships in this build, for the honest audio-free mode. */
  isAvailable(): Promise<boolean>;
};
