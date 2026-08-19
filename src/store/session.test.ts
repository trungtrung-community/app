/**
 * @fileoverview The running-stop slice — start loads and plans, commit updates
 * the session synchronously and forwards persisted progress to the snapshot
 * slice. Phases per docs/11.
 */

import {beforeEach, describe, expect, it} from 'vitest';

import type {Exercise, ExerciseFamily} from '../ports/content-exercise';
import type {ContentSource} from '../ports';
import type {
  ContentItemId,
  ExerciseId,
  StopId,
  Track,
  VocabId,
} from '../ports/content-ids';
import type {Stop, StopPosition, VocabularyItem} from '../ports/content-model';
import type {Progress, ProgressStore} from '../ports/progress-store';

import {override, resetContainer} from '../composition/container';
import {useProgress} from './progress';
import {useStopSession} from './session';

const STOP_ID = 'stop.core.c1.1' as StopId;

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

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
  positionCount: 3,
  complete: true,
  items: [{ordinal: 1, id: 'vocab.cha' as ContentItemId, kind: 'vocab', role: 'teach'}],
};

const POSITION = {stopId: STOP_ID, n: 1, screen: null};

const SCRIPT: readonly StopPosition[] = [
  {...POSITION, kind: 'word-card', itemId: 'vocab.cha' as VocabId},
  {...POSITION, kind: 'exercise', exerciseId: 'ex.1' as ExerciseId},
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
    {ordinal: 1, itemId: 'vocab.cha' as ContentItemId, label: null, isAnswer: true},
    {ordinal: 2, itemId: 'vocab.other' as ContentItemId, label: null, isAnswer: false},
  ],
  chunks: [],
  type: 'meaning-pick',
};

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

const CONTENT = {
  getStop: async () => STOP,
  getStopScript: async () => SCRIPT,
  listExercisesByStop: async () => [EXERCISE],
  getVocabulary: async (id: VocabId) => word(id),
  getPhrase: async () => {
    throw new Error('no phrases in this stop');
  },
} as unknown as ContentSource;

function memoryStore(): ProgressStore {
  let last = EMPTY;
  return {
    async load() {
      return last;
    },
    async save(progress) {
      last = progress;
    },
    async export() {
      return '';
    },
    async clear() {
      last = EMPTY;
    },
  };
}

beforeEach(() => {
  resetContainer();
  override('content', CONTENT);
  override('progress', memoryStore());
  useProgress.setState({progress: null});
  useStopSession.getState().reset();
});

describe('start', () => {
  it('loads, plans and lands ready', async () => {
    // When
    await useStopSession.getState().start(STOP_ID);

    // Then
    const slice = useStopSession.getState();
    expect(slice.status).toBe('ready');
    expect(slice.stop?.name).toBe('Hello, and a way out');
    expect(slice.state?.queue.map(entry => entry.position.kind)).toEqual([
      'card',
      'exercise',
      'end',
    ]);
    expect(slice.itemsById.get('vocab.cha' as ContentItemId)?.roman).toBe('vocab.cha');
  });
});

describe('commit', () => {
  it('advances the session and forwards persisted progress to the snapshot', async () => {
    // Given
    await useStopSession.getState().start(STOP_ID);

    // When — the word card commits
    await useStopSession.getState().commit({kind: 'continue'});

    // Then
    expect(useStopSession.getState().state?.index).toBe(1);
    expect(useProgress.getState().progress?.items['vocab.cha']?.state).toBe('met');
  });
});

describe('reset', () => {
  it('returns to idle', async () => {
    // Given
    await useStopSession.getState().start(STOP_ID);

    // When
    useStopSession.getState().reset();

    // Then
    expect(useStopSession.getState().status).toBe('idle');
    expect(useStopSession.getState().state).toBeNull();
  });
});
