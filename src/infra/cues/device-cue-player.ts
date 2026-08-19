/**
 * @fileoverview Cues on a real device: expo-audio for the sound, expo-haptics for the tick.
 *
 * The class depends on two tiny interfaces rather than on either package, the same way
 * `MmkvProgressStore` depends on a three-method key/value store. That is what keeps the
 * part with rules in it — which preference gates what, which cues move the phone, what a
 * repeat fire does — testable in a plain node run, and confines the native modules to one
 * factory at the bottom of the file.
 *
 * It matters practically too. `expo-haptics` is unavailable on web, and the component
 * suite renders through react-native-web; a class that imported it directly could not be
 * exercised at all.
 */

import {CUES, DEFAULT_CUE_PREFERENCES, type Cue, type CuePreferences} from '../../domain/cue';
import type {CuePlayer} from '../../ports/cue-player';

import {CLIPS, type BoundCue} from './clips';

/** The slice of an audio player a cue needs. Two members, both trivially fakeable. */
export type CueSound = {
  /**
   * Play from the beginning, whether or not it is already playing.
   *
   * Not `play()`. A cue fired twice in quick succession has to sound twice, and a player
   * left at the end of its clip answers `play()` with nothing at all — which reads on a
   * device as "the second correct answer was silent".
   */
  replay(): void;
  /** 0–1. Set once from the clip's gain; the testbed changes it while tuning. */
  setVolume(gain: number): void;
};

/** The slice of a haptics engine a cue needs. */
export type CueHaptics = {
  /** One soft tick. Never a pattern, never a buzz. */
  tick(): void;
};

/**
 * The device adapter.
 *
 * Both switches are checked here rather than at the call site, which is the whole reason
 * the port exists: P2's row promises to turn interface sounds off, and a promise kept in
 * fifty places is kept in forty-nine.
 */
export class DeviceCuePlayer implements CuePlayer {
  private preferences: CuePreferences = DEFAULT_CUE_PREFERENCES;

  constructor(
    private readonly sounds: Partial<Record<Cue, CueSound>>,
    private readonly haptics: CueHaptics,
  ) {}

  async play(cue: Cue): Promise<void> {
    // Sound and tick are independent: a cue with no clip may still move the phone, and a
    // learner with vibration off still hears it. Nothing here is an else-branch.
    if (this.preferences.sound) {
      this.sounds[cue]?.replay();
    }
    if (this.preferences.haptics && CUES[cue].haptic) {
      this.haptics.tick();
    }
  }

  async setPreferences(preferences: CuePreferences): Promise<void> {
    this.preferences = preferences;
  }

  /**
   * Change a clip's volume while the app is running.
   *
   * Not on the port, and deliberately: shipping code sets a gain once from `CLIPS` and
   * never touches it again. This exists for `/_ds/feel`, where the numbers in that table
   * are decided by ear, and the alternative is a rebuild per adjustment.
   */
  setGain(cue: BoundCue, gain: number): void {
    this.sounds[cue]?.setVolume(gain);
  }
}

/**
 * The real one, with the native modules attached.
 *
 * Players are created here rather than on first play, and creating one loads its source —
 * so this constructor *is* the preload. A cue that decodes its file the first time it
 * fires arrives late exactly once per launch, which is the launch a learner is forming an
 * impression on.
 */
export async function createDeviceCuePlayer(): Promise<DeviceCuePlayer> {
  const [{createAudioPlayer}, haptics] = await Promise.all([
    import('expo-audio'),
    import('expo-haptics'),
  ]);
  const {SOURCES} = await import('./sources');

  const sounds: Partial<Record<Cue, CueSound>> = {};
  for (const [cue, clip] of Object.entries(CLIPS) as [BoundCue, (typeof CLIPS)[BoundCue]][]) {
    const player = createAudioPlayer(SOURCES[cue]);
    player.volume = clip.gain;
    sounds[cue] = {
      replay() {
        // Both calls are fired without awaiting the seek. Awaiting would put a promise
        // tick between the tap and the sound on every single fire, to fix an overlap that
        // only happens on a repeat — and `/_ds/feel`'s rapid-fire button is there to show
        // whether that trade was the right way round on a real device.
        void player.seekTo(0);
        player.play();
      },
      setVolume(gain: number) {
        player.volume = gain;
      },
    };
  }

  return new DeviceCuePlayer(sounds, {
    tick() {
      // `ImpactFeedbackStyle.Soft` rather than `NotificationFeedbackType.Success`: the
      // notification generator fires a three-part pattern that reads as a system alert,
      // and `docs/05` asked for one soft tick. Not awaited, and errors are dropped —
      // a device with no haptic engine rejects, and a lesson must not notice.
      void haptics.impactAsync(haptics.ImpactFeedbackStyle.Soft).catch(() => {});
    },
  });
}
