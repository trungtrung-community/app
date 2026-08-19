/**
 * @fileoverview The audio gate over the new renderers — growing the allow-list
 * changes nothing today, and surfaces the drills the day takes land. Phases
 * per docs/11.
 */

import {describe, expect, it} from 'vitest';

import type {ContentItemId, ExerciseId, StopId, Track} from '../ports/content-ids';
import type {Exercise, ExerciseFamily} from '../ports/content-exercise';

import {toSeedExercise, type PlanContext} from './exercise-seed';

/** Today's build: no recordings shipped, the audio-free switch off. */
const TODAY: PlanContext = {audioAvailable: false, audioFree: false};

/** The build the shells exist for: recordings shipped, switch off. */
const WITH_AUDIO: PlanContext = {audioAvailable: true, audioFree: false};

type CoreOverrides = {
  readonly blockedOn?: 'audio' | null;
};

function core(id: string, over: CoreOverrides) {
  return {
    id: id as ExerciseId,
    stopId: 'stop.test' as StopId,
    track: 'speak' as Track,
    ordinal: 1,
    family: 'record-compare' as ExerciseFamily,
    target: {id: 'phrase.p' as ContentItemId, kind: 'phrase' as const},
    answerId: 'phrase.p' as ContentItemId,
    blockedOn: over.blockedOn ?? null,
    prompt: {audioPath: null, bo: null, roman: null, en: null},
    distractorRule: null,
    reason: null,
    options: [],
    chunks: [],
  };
}

function phraseProduce(over: CoreOverrides = {}): Exercise {
  return {...core('ex.produce', over), type: 'phrase-produce', note: 'imitative only'};
}

function readItAloud(over: CoreOverrides = {}): Exercise {
  return {
    ...core('ex.aloud', over),
    type: 'read-it-aloud',
    glyph: 'བསྒྲིབས',
    compareWith: 'read/aloud.mp3',
    scored: false,
  };
}

function hearItFindIt(over: CoreOverrides = {}): Exercise {
  return {...core('ex.find', over), type: 'hear-it-find-it'};
}

const GATED: readonly Exercise[] = [phraseProduce(), readItAloud(), hearItFindIt()];

describe('the audio gate over the shell renderers', () => {
  it('hides all three while the build ships no recordings', () => {
    // Then
    // Growing the allow-list changed nothing about today
    for (const exercise of GATED) {
      expect(toSeedExercise(exercise, TODAY, false)).toBeNull();
    }
  });

  it('hides a drill whose own take is missing, whatever the build ships', () => {
    // Then
    // blockedOn is per drill, and audio in the build does not clear it
    for (const exercise of [
      phraseProduce({blockedOn: 'audio'}),
      readItAloud({blockedOn: 'audio'}),
      hearItFindIt({blockedOn: 'audio'}),
    ]) {
      expect(toSeedExercise(exercise, WITH_AUDIO, false)).toBeNull();
    }
  });

  it('hides all three under the audio-free switch, whatever the build ships', () => {
    // Then
    // A1 is the learner's word, and it outranks the manifest
    for (const exercise of GATED) {
      expect(toSeedExercise(exercise, {audioAvailable: true, audioFree: true}, false)).toBeNull();
    }
  });

  it('surfaces each drill as itself the day its take lands', () => {
    // When
    const seeds = GATED.map(exercise => toSeedExercise(exercise, WITH_AUDIO, false));

    // Then
    // The drills emit seed positions under their own presentations
    expect(seeds.map(seed => seed?.presentation)).toEqual([
      'phrase-produce',
      'read-it-aloud',
      'hear-it-find-it',
    ]);
    // Record-compare commits a plain continue; the glyph drill taps.
    expect(seeds.map(seed => seed?.commitMode)).toEqual(['none', 'none', 'tap']);
  });
});
