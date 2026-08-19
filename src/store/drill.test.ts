/**
 * @fileoverview The drill-session slice — start resolves the pool and decides
 * the route, the runners fold every rating into progress, and the latch drops
 * a tap delivered mid-commit. Setup lives in `beforeEach`: a three-word
 * district double, a memory store, a silent build. Phases per docs/11.
 */

import {beforeEach, describe, expect, it} from 'vitest';

import type {Exercise, ExerciseFamily} from '../ports/content-exercise';
import type {AudioSource, ContentSource} from '../ports';
import type {ContentItemId, ExerciseId, StopId, Track, VocabId} from '../ports/content-ids';
import type {District, Stop, VocabularyItem} from '../ports/content-model';
import type {Progress, ProgressStore} from '../ports/progress-store';

import {override, resetContainer} from '../composition/container';
import {addDays, toIsoDate} from '../domain/date';
import {markTaught, newItem, recordCorrect, type ItemId, type ItemProgress} from '../domain/item';
import {selectWorthAnotherLook, useDrillSession} from './drill';
import {useProgress} from './progress';

const STOP_ID = 'stop.core.c1.1' as StopId;
const TODAY = toIsoDate(new Date());

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

const DISTRICT: District = {
  id: 'district.core',
  number: 1,
  slug: 'core',
  name: 'First Words',
  sectionId: 'section.speak.1',
} as unknown as District;

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
  capabilities: [],
  positionCount: 3,
  complete: true,
  items: [],
};

const WORDS = ['vocab.a', 'vocab.b', 'vocab.c'] as const;

function exercise(n: number, target: string, other: string): Exercise {
  return {
    id: `ex.${n}` as ExerciseId,
    stopId: STOP_ID,
    track: 'speak' as Track,
    ordinal: n,
    family: 'tap-select (text)' as ExerciseFamily,
    target: {id: target as ContentItemId, kind: 'vocab'},
    answerId: target as ContentItemId,
    blockedOn: null,
    prompt: {audioPath: null, bo: null, roman: null, en: null},
    distractorRule: null,
    reason: null,
    options: [
      {ordinal: 1, itemId: target as ContentItemId, label: null, isAnswer: true},
      {ordinal: 2, itemId: other as ContentItemId, label: null, isAnswer: false},
    ],
    chunks: [],
    type: 'meaning-pick',
  };
}

const EXERCISES = [
  exercise(1, 'vocab.a', 'vocab.b'),
  exercise(2, 'vocab.b', 'vocab.c'),
  exercise(3, 'vocab.c', 'vocab.a'),
];

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
  listDistricts: async () => [DISTRICT],
  getDistrict: async () => DISTRICT,
  listStopsByDistrict: async () => [STOP],
  listStopsBySection: async () => [STOP],
  getStop: async () => STOP,
  listExercisesByStop: async () => EXERCISES,
  getVocabulary: async (id: VocabId) => word(id),
  getPhrase: async () => {
    throw new Error('no phrases in this district');
  },
} as unknown as ContentSource;

const SILENT: AudioSource = {
  resolve: async () => null,
  isAvailable: async () => false,
};

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

function met(ids: readonly string[]): Progress {
  const items: Record<string, ItemProgress> = {};
  for (const id of ids) {
    items[id] = markTaught(newItem(id as ItemId));
  }
  return {...EMPTY, items};
}

beforeEach(() => {
  resetContainer();
  override('content', CONTENT);
  override('progress', memoryStore());
  override('audio', SILENT);
  useProgress.setState({progress: null});
  useDrillSession.getState().reset();
});

describe('start with no mode — the picker read', () => {
  it('resolves the set to the taught items and routes to the picker', async () => {
    // Given
    useProgress.setState({progress: met(WORDS)});

    // When
    await useDrillSession.getState().start({kind: 'district', slug: 'core'}, 'all', null);

    // Then
    const slice = useDrillSession.getState();
    expect(slice.status).toBe('ready');
    expect(slice.route).toBe('picker');
    expect(slice.set?.itemIds).toEqual([...WORDS]);
    expect(slice.state).toBeNull();
    expect(slice.deck).toBeNull();
  });

  it('routes a set of two straight to flashcards, and an untaught pool to empty', async () => {
    // Given
    useProgress.setState({progress: met(WORDS.slice(0, 2))});

    // When
    await useDrillSession.getState().start({kind: 'district', slug: 'core'}, 'all', null);

    // Then
    expect(useDrillSession.getState().route).toBe('flashcards');

    // When
    useProgress.setState({progress: EMPTY});
    await useDrillSession.getState().start({kind: 'district', slug: 'core'}, 'all', null);

    // Then
    expect(useDrillSession.getState().route).toBe('empty');
  });
});

describe('a pool that does not load', () => {
  it('lands on error instead of loading forever', async () => {
    // Given
    const broken = {
      listStopsByDistrict: async () => {
        throw new Error('no such district');
      },
    } as unknown as ContentSource;
    override('content', broken);

    // When
    await useDrillSession.getState().start({kind: 'district', slug: 'core'}, 'all', null);

    // Then
    expect(useDrillSession.getState().status).toBe('error');
  });
});

describe('an engine drill', () => {
  it('seeds the session and folds a correct tap into the live snapshot', async () => {
    // Given
    useProgress.setState({progress: met(WORDS)});
    await useDrillSession
      .getState()
      .start({kind: 'district', slug: 'core'}, 'all', 'word-recognise');
    const state = useDrillSession.getState().state;
    expect(state?.queue.map(entry => entry.position.kind)).toEqual([
      'exercise',
      'exercise',
      'exercise',
      'end',
    ]);
    const entry = state?.queue[0];
    const answer =
      entry?.position.kind === 'exercise'
        ? (entry.options ?? entry.position.exercise.options).find(option => option.isAnswer)
        : undefined;
    const itemId = answer?.itemId ?? '';

    // When
    await useDrillSession.getState().commit({kind: 'tap', itemId});

    // Then — the verdict stands and the fold reached the snapshot slice
    expect(useDrillSession.getState().state?.answered?.verdict).toBe('correct');
    expect(useProgress.getState().progress?.items[itemId]?.correctOn).toEqual([TODAY]);
  });

  it('drops a tap delivered while a commit runs', async () => {
    // Given
    useProgress.setState({progress: met(WORDS)});
    await useDrillSession
      .getState()
      .start({kind: 'district', slug: 'core'}, 'all', 'word-recognise');
    const state = useDrillSession.getState().state;
    const entry = state?.queue[0];
    const options =
      entry?.position.kind === 'exercise' ? (entry.options ?? entry.position.exercise.options) : [];
    const answer = options.find(option => option.isAnswer);
    const wrong = options.find(option => !option.isAnswer);

    // When — a wrong tap lands before the correct tap's commit resolves
    const first = useDrillSession.getState().commit({kind: 'tap', itemId: answer?.itemId ?? ''});
    const second = useDrillSession.getState().commit({kind: 'tap', itemId: wrong?.itemId ?? ''});
    await Promise.all([first, second]);

    // Then — exactly one commit took effect
    const after = useDrillSession.getState().state;
    expect(after?.answered?.verdict).toBe('correct');
    expect(after?.misses).toEqual([]);
  });
});

describe('a flashcard drill', () => {
  it('deals the deck and folds each rating, stamping the day at the end', async () => {
    // Given
    useProgress.setState({progress: met(WORDS)});
    await useDrillSession.getState().start({kind: 'district', slug: 'core'}, 'all', 'flashcards');
    const deck = useDrillSession.getState().deck;
    expect(deck?.total).toBe(3);
    const firstCard = deck?.queue[0]?.itemId ?? '';

    // When — Again on the first card, Got it on the rest
    await useDrillSession.getState().rate('again');
    let guard = 0;
    while (useDrillSession.getState().deck?.phase === 'running' && guard++ < 10) {
      await useDrillSession.getState().rate('got-it');
    }

    // Then — the miss and the corrects reached the snapshot, and the day counts
    const progress = useProgress.getState().progress;
    expect(useDrillSession.getState().deck?.phase).toBe('ended');
    expect(progress?.items[firstCard]?.missedOn).toEqual([TODAY]);
    expect(progress?.walkedOn).toEqual([TODAY]);
    expect(progress?.completedStops).toEqual([]);
    expect(selectWorthAnotherLook(null, useDrillSession.getState().deck)).toEqual([firstCard]);
  });
});

describe('the review', () => {
  it('runs everything due today in the scheduler’s order', async () => {
    // Given — b is more overdue than a; c was never answered and is not due
    const known = (id: string, daysAgo: number): ItemProgress =>
      recordCorrect(
        recordCorrect(markTaught(newItem(id as ItemId)), addDays(TODAY, -daysAgo - 2)),
        addDays(TODAY, -daysAgo),
      );
    useProgress.setState({
      progress: {
        ...EMPTY,
        items: {
          'vocab.a': known('vocab.a', 3),
          'vocab.b': known('vocab.b', 6),
          'vocab.c': markTaught(newItem('vocab.c' as ItemId)),
        },
      },
    });

    // When
    await useDrillSession.getState().startReview();

    // Then — the most overdue leads and the untaught-due item is absent
    const state = useDrillSession.getState().state;
    expect(state?.stopId).toBe('drill:review');
    const asked = (state?.queue ?? [])
      .map(entry => (entry.position.kind === 'exercise' ? entry.position.exercise.itemId : null))
      .filter(itemId => itemId !== null);
    expect(asked).toEqual(['vocab.b', 'vocab.a']);
  });
});

describe('reset', () => {
  it('returns to idle', async () => {
    // Given
    useProgress.setState({progress: met(WORDS)});
    await useDrillSession.getState().start({kind: 'district', slug: 'core'}, 'all', 'flashcards');

    // When
    useDrillSession.getState().reset();

    // Then
    expect(useDrillSession.getState().status).toBe('idle');
    expect(useDrillSession.getState().deck).toBeNull();
  });
});
