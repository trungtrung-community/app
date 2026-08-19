/**
 * @fileoverview startStop — load, plan, resolve, deal. The doubles are the narrow
 * capabilities, which is the interface-segregation payoff: five methods, not
 * twenty-three. Phases per docs/11.
 */

import {describe, expect, it} from 'vitest';

import {seededRng} from '../engine/rng';
import type {Exercise, ExerciseFamily} from '../ports/content-exercise';
import type {
  ContentItemId,
  ExerciseId,
  PhraseId,
  StopId,
  Track,
  VocabId,
} from '../ports/content-ids';
import type {PhraseItem, Stop, StopPosition, VocabularyItem} from '../ports/content-model';

import {startStop, type StartStopDeps} from './start-stop';

const STOP_ID = 'stop.core.c1.1' as StopId;

function word(id: string): VocabularyItem {
  return {
    id: id as VocabId,
    slug: id,
    district: 'core',
    districtNumber: 1,
    wordId: id,
    bo: 'ཇ',
    roman: id,
    en: `gloss of ${id}`,
    enDefinition: null,
    wylie: null,
    thl: null,
    thlNote: null,
    pos: null,
    register: null,
    culturalNote: null,
    illustration: null,
    artifact: false,
    audio: {path: `audio/${id}.m4a`, available: false},
  };
}

function phrase(id: string): PhraseItem {
  return {
    id: id as PhraseId,
    slug: id,
    district: 'core',
    districtNumber: 1,
    bo: 'ཇ་འདི',
    roman: id,
    en: `gloss of ${id}`,
    enDefinition: null,
    enLiteral: null,
    usageNote: null,
    culturalNote: null,
    wylie: null,
    thl: null,
    register: null,
    illustration: null,
    artifact: false,
    template: false,
    audio: {path: `audio/${id}.m4a`, available: false},
    chunks: [],
  };
}

const STOP: Stop = {
  id: STOP_ID,
  track: 'speak',
  district: 'core',
  sectionId: 'section.speak.1' as never,
  ordinal: 1,
  circuit: 1,
  node: null,
  shape: 'items',
  name: 'Hello, and a way out',
  outcome: 'You can greet someone.',
  capabilities: ['Greet someone'],
  positionCount: 4,
  complete: true,
  items: [
    {ordinal: 1, id: 'vocab.cha' as ContentItemId, kind: 'vocab', role: 'teach'},
    {ordinal: 2, id: 'phrase.hello' as ContentItemId, kind: 'phrase', role: 'teach'},
  ],
};

const POSITION = {stopId: STOP_ID, n: 1, screen: null};

const SCRIPT: readonly StopPosition[] = [
  {...POSITION, kind: 'intro', text: 'Hello', outcome: 'Greet', capabilities: ['Greet someone']},
  {...POSITION, kind: 'word-card', itemId: 'vocab.cha' as VocabId},
  {...POSITION, kind: 'exercise', exerciseId: 'ex.1' as ExerciseId},
  {...POSITION, kind: 'phrase-card', itemId: 'phrase.hello' as PhraseId},
  {...POSITION, kind: 'end', capabilities: ['Greet someone'], recap: null},
];

const EXERCISE: Exercise = {
  id: 'ex.1' as ExerciseId,
  stopId: STOP_ID,
  track: 'speak' as Track,
  ordinal: 1,
  family: 'tap-select (text)' as ExerciseFamily,
  target: {id: 'vocab.cha' as ContentItemId, kind: 'vocab'},
  answerId: 'vocab.cha' as ContentItemId,
  blockedOn: null,
  prompt: {audioPath: null, bo: null, roman: null, en: null},
  distractorRule: null,
  reason: null,
  options: [
    {itemId: 'vocab.cha' as ContentItemId, label: null, isAnswer: true},
    {itemId: 'vocab.distractor' as ContentItemId, label: null, isAnswer: false},
  ],
  chunks: [],
  type: 'meaning-pick',
};

function deps(): StartStopDeps {
  return {
    walk: {
      listSections: async () => [],
      listDistricts: async () => [],
      getDistrict: async () => {
        throw new Error('unused');
      },
      getStop: async () => STOP,
      listStopsByDistrict: async () => [],
      listStopsBySection: async () => [],
      getStopScript: async () => SCRIPT,
    },
    exercises: {
      getExercise: async () => EXERCISE,
      listExercisesByStop: async () => [EXERCISE],
    },
    dictionary: {
      getVocabulary: async id => word(id),
      listVocabularyByDistrict: async () => [],
      searchVocabulary: async () => [],
      getPhrase: async id => phrase(id),
      listPhrasesByDistrict: async () => [],
      searchPhrases: async () => [],
    },
  };
}

describe('startStop', () => {
  it('loads the stop, plans the script, and creates the session', async () => {
    // When
    const session = await startStop(deps(), STOP_ID, seededRng(1));

    // Then
    expect(session.stop.name).toBe('Hello, and a way out');
    expect(session.state.stopId).toBe(STOP_ID);
    expect(session.state.queue.map(entry => entry.position.kind)).toEqual([
      'intro',
      'card',
      'exercise',
      'card',
      'end',
    ]);
  });

  it('resolves every card item and every option item for display', async () => {
    // When
    const session = await startStop(deps(), STOP_ID, seededRng(1));

    // Then — the distractor is fetched by the target's kind, since distractors
    // share it
    expect(session.itemsById.get('vocab.cha' as ContentItemId)?.roman).toBe('vocab.cha');
    expect(session.itemsById.get('phrase.hello' as ContentItemId)?.roman).toBe('phrase.hello');
    expect(session.itemsById.get('vocab.distractor' as ContentItemId)?.roman).toBe(
      'vocab.distractor',
    );
  });
});
