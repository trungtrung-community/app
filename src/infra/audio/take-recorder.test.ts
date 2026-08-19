/**
 * @fileoverview The take recorder's rules, against a mocked engine.
 *
 * `expo-audio` and `expo-file-system` are mocked at the module seam for
 * `clip-player.test.ts`'s reason: this adapter has no port between itself and
 * the engine — its whole job is to drive `AudioModule.AudioRecorder` correctly.
 * What matters to the product is asserted here: the session allows recording
 * only while a take runs, failure is a value and never a throw, and a deleted
 * take is genuinely gone.
 */

import {beforeEach, describe, expect, it, vi} from 'vitest';

import {createTakeRecorder, type TakeRecorder} from './take-recorder';

const engine = vi.hoisted(() => {
  class FakeAudioRecorder {
    static failOnPrepare = false;
    static failOnStop = false;
    static instances: FakeAudioRecorder[] = [];
    recording = false;
    released = false;
    uri: string | null = null;

    constructor(readonly options: unknown) {
      FakeAudioRecorder.instances.push(this);
    }

    async prepareToRecordAsync(options: unknown): Promise<void> {
      this.preparedWith = options;
      if (FakeAudioRecorder.failOnPrepare) {
        throw new Error('hardware busy');
      }
    }

    preparedWith: unknown = null;

    record(): void {
      this.recording = true;
    }

    async stop(): Promise<void> {
      if (FakeAudioRecorder.failOnStop) {
        throw new Error('lost the session');
      }
      this.recording = false;
      this.uri = 'file:///cache/take-1.m4a';
    }

    release(): void {
      this.released = true;
    }
  }

  return {
    FakeAudioRecorder,
    modes: [] as {allowsRecording?: boolean}[],
    permission: {granted: true, status: 'granted'},
    requested: {granted: true, status: 'granted'},
    deleted: [] as string[],
    deleteThrows: false,
  };
});

vi.mock('expo-audio', () => ({
  AudioModule: {AudioRecorder: engine.FakeAudioRecorder},
  RecordingPresets: {HIGH_QUALITY: {extension: '.m4a'}},
  setAudioModeAsync: vi.fn(async (mode: {allowsRecording?: boolean}) => {
    engine.modes.push(mode);
  }),
  getRecordingPermissionsAsync: vi.fn(async () => engine.permission),
  requestRecordingPermissionsAsync: vi.fn(async () => engine.requested),
}));

vi.mock('expo-file-system', () => ({
  File: class {
    constructor(readonly uri: string) {}

    delete(): void {
      if (engine.deleteThrows) {
        throw new Error('no such file');
      }
      engine.deleted.push(this.uri);
    }
  },
}));

/** The allowsRecording values the session saw, in order. */
function sessionFlips(): readonly (boolean | undefined)[] {
  return engine.modes.map(mode => mode.allowsRecording);
}

describe('createTakeRecorder', () => {
  let recorder: TakeRecorder;

  beforeEach(() => {
    recorder = createTakeRecorder();
    engine.FakeAudioRecorder.failOnPrepare = false;
    engine.FakeAudioRecorder.failOnStop = false;
    engine.FakeAudioRecorder.instances = [];
    engine.modes = [];
    engine.permission = {granted: true, status: 'granted'};
    engine.requested = {granted: true, status: 'granted'};
    engine.deleted = [];
    engine.deleteThrows = false;
  });

  it('allows recording only while the take runs', async () => {
    // When
    const started = await recorder.start();
    const stopped = await recorder.stop();

    // Then
    expect(started).toEqual({ok: true});
    expect(stopped).toEqual({ok: true, uri: 'file:///cache/take-1.m4a'});
    expect(sessionFlips()).toEqual([true, false]);
    expect(engine.FakeAudioRecorder.instances[0]?.recording).toBe(false);
  });

  it('surfaces a recorder that cannot start as a value, with the session restored', async () => {
    // Given
    engine.FakeAudioRecorder.failOnPrepare = true;

    // When
    const started = await recorder.start();

    // Then
    // M3's state: a value, never a throw
    expect(started).toEqual({ok: false, reason: 'unavailable'});
    expect(sessionFlips()).toEqual([true, false]);
  });

  it('surfaces a stop that loses the take, and still restores the session', async () => {
    // Given
    await recorder.start();
    engine.FakeAudioRecorder.failOnStop = true;

    // When
    const stopped = await recorder.stop();

    // Then
    expect(stopped).toEqual({ok: false, reason: 'unavailable'});
    expect(sessionFlips()).toEqual([true, false]);
  });

  it('refuses to stop what never started, without touching the session', async () => {
    // When
    const stopped = await recorder.stop();

    // Then
    expect(stopped).toEqual({ok: false, reason: 'unavailable'});
    expect(sessionFlips()).toEqual([]);
  });

  it('deletes a take by its uri', async () => {
    // When
    await recorder.deleteTake('file:///cache/take-1.m4a');

    // Then
    // The ephemerality sentence, made true
    expect(engine.deleted).toEqual(['file:///cache/take-1.m4a']);
  });

  it('treats a take already gone as deleted', async () => {
    // Given
    engine.deleteThrows = true;

    // Then
    await expect(recorder.deleteTake('file:///cache/gone.m4a')).resolves.toBeUndefined();
  });

  it('maps the permission responses onto the three states', async () => {
    // Given
    engine.permission = {granted: false, status: 'undetermined'};
    engine.requested = {granted: false, status: 'denied'};

    // Then
    expect(await recorder.queryPermission()).toBe('undetermined');
    expect(await recorder.requestPermission()).toBe('denied');
  });

  it('frees the native recorder on release, and survives doing it twice', async () => {
    // Given
    await recorder.start();
    const native = engine.FakeAudioRecorder.instances[0];

    // When
    await recorder.release();
    await recorder.release();

    // Then
    expect(native?.released).toBe(true);
  });
});
