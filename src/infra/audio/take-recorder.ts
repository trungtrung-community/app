/**
 * @fileoverview Recording one take, and deleting it afterwards.
 *
 * The learner's side of record-compare: start captures into the platform's cache
 * directory, stop hands back the file URI, and `deleteTake` is what makes docs/01's
 * ephemerality sentence true — a take exists for the compare, then it is gone.
 * Nothing here uploads, keeps, or measures a recording.
 *
 * The surface is `expo-audio`'s imperative one: `AudioModule.AudioRecorder`, the
 * same class `useAudioRecorder` constructs, reached directly because an infra
 * module has no component lifecycle to hand a hook. The package exports it from
 * the root, and importing the root also applies the package's own
 * `prepareToRecordAsync` patch that converts `RecordingPresets` per platform.
 *
 * Around every take the audio session flips `allowsRecording` on and back off —
 * the promise `audio-session.ts` makes: on iOS a session that allows recording
 * drops playback volume for as long as it is set, so it is set only while a
 * take is actually being captured.
 *
 * Failure is a typed result, never a throw. A microphone that cannot start —
 * hardware busy, session refused — is M3's Toast, and a Toast needs a value,
 * not an exception unwinding through a renderer.
 *
 * `expo-audio` and `expo-file-system` are reached by dynamic import for
 * `clip-player.ts`'s reason: a module that names the engine at the top makes
 * every test file pay to load it.
 */

import type {AudioRecorder} from 'expo-audio';

/** What the platform says about the microphone. `undetermined` means M1 runs first. */
export type MicPermission = 'granted' | 'denied' | 'undetermined';

/**
 * How starting or stopping a take can end. `unavailable` is M3's state:
 * the hardware or the session refused, and the exercise carries on without.
 */
export type StartTakeResult = {ok: true} | {ok: false; reason: 'unavailable'};
export type StopTakeResult = {ok: true; uri: string} | {ok: false; reason: 'unavailable'};

export type TakeRecorder = {
  /** What the platform currently says, without asking the learner anything. */
  queryPermission(): Promise<MicPermission>;
  /** Raise the system dialog. M1's primer must have run before this. */
  requestPermission(): Promise<MicPermission>;
  /** Begin capturing a take into the cache. Flips the session to allow recording. */
  start(): Promise<StartTakeResult>;
  /** End the take and restore the playback-only session. */
  stop(): Promise<StopTakeResult>;
  /** Remove a take's file. A take already gone is the state this wanted. */
  deleteTake(uri: string): Promise<void>;
  /** Free the native recorder. A later `start` builds a fresh one. */
  release(): Promise<void>;
};

function toPermission(response: {granted: boolean; status: string}): MicPermission {
  if (response.granted) {
    return 'granted';
  }
  return response.status === 'undetermined' ? 'undetermined' : 'denied';
}

/**
 * A recorder for learner takes.
 *
 * @example
 * const recorder = createTakeRecorder();
 * if ((await recorder.start()).ok) { ... }
 * const stopped = await recorder.stop();
 * if (stopped.ok) { await recorder.deleteTake(stopped.uri); }
 */
export function createTakeRecorder(): TakeRecorder {
  let recorder: AudioRecorder | null = null;

  /** Best-effort return to the playback-only session `audio-session.ts` set. */
  async function restorePlaybackSession(): Promise<void> {
    try {
      const {setAudioModeAsync} = await import('expo-audio');
      await setAudioModeAsync({allowsRecording: false});
    } catch {
      // The session module already failed once; there is nothing more to restore.
    }
  }

  return {
    async queryPermission() {
      try {
        const {getRecordingPermissionsAsync} = await import('expo-audio');
        return toPermission(await getRecordingPermissionsAsync());
      } catch {
        // A platform that cannot even answer runs the exercise without a mic.
        return 'denied';
      }
    },

    async requestPermission() {
      try {
        const {requestRecordingPermissionsAsync} = await import('expo-audio');
        return toPermission(await requestRecordingPermissionsAsync());
      } catch {
        return 'denied';
      }
    },

    async start() {
      try {
        const {AudioModule, RecordingPresets, setAudioModeAsync} = await import('expo-audio');
        await setAudioModeAsync({allowsRecording: true});
        recorder ??= new AudioModule.AudioRecorder({});
        await recorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
        recorder.record();
        return {ok: true};
      } catch {
        await restorePlaybackSession();
        return {ok: false, reason: 'unavailable'};
      }
    },

    async stop() {
      const current = recorder;
      if (current === null) {
        // Nothing ever started, so the session was never flipped.
        return {ok: false, reason: 'unavailable'};
      }
      try {
        await current.stop();
        const uri = current.uri;
        return uri === null ? {ok: false, reason: 'unavailable'} : {ok: true, uri};
      } catch {
        return {ok: false, reason: 'unavailable'};
      } finally {
        await restorePlaybackSession();
      }
    },

    async deleteTake(uri) {
      try {
        const {File} = await import('expo-file-system');
        new File(uri).delete();
      } catch {
        // Deleting a take that is already gone is the state deleteTake wanted.
      }
    },

    async release() {
      const current = recorder;
      recorder = null;
      if (current === null) {
        return;
      }
      try {
        current.release();
      } catch {
        // Already released by the engine — which is the state release wanted.
      }
    },
  };
}
