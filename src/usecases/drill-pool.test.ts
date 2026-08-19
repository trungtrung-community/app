/**
 * @fileoverview The pool is a filter, not a field — docs/03 §4.6. The doubles
 * are the three narrow capabilities, as in start-stop.test.ts. Phases per
 * docs/11.
 */

import {describe, expect, it} from 'vitest';

import type {Exercise, ExerciseFamily} from '../ports/content-exercise';
import type {
  ContentItemId,
  DistrictId,
  ExerciseId,
  PhraseId,
  SectionId,
  StopId,
  Track,
  VocabId,
} from '../ports/content-ids';
import type {District, PhraseItem, Stop, VocabularyItem} from '../ports/content-model';

import {gatherPool, parsePoolParam, poolParam, type DrillPoolDeps} from './drill-pool';

const SECTION_ID = 'section.speak.1' as SectionId;

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

function stop(id: string, district: string | null): Stop {
  return {
    id: id as StopId,
    track: 'speak',
    district,
    sectionId: SECTION_ID,
    ordinal: 1,
    circuit: 1,
    node: null,
    shape: 'items',
    name: id,
    outcome: '',
    capabilities: [],
    positionCount: 0,
    complete: true,
    items: [],
  };
}

function drill(
  id: string,
  stopId: string,
  type: 'meaning-pick' | 'phrase-recognise' | 'pair-match',
  target: {id: string; kind: 'vocab' | 'phrase'} | null,
): Exercise {
  const core = {
    id: id as ExerciseId,
    stopId: stopId as StopId,
    track: 'speak' as Track,
    ordinal: 1,
    family: 'tap-select (text)' as ExerciseFamily,
    target: target === null ? null : {id: target.id as ContentItemId, kind: target.kind},
    answerId: null,
    blockedOn: null,
    prompt: {audioPath: null, bo: null, roman: null, en: null},
    distractorRule: null,
    reason: null,
    options: [],
    chunks: [],
  };
  return type === 'pair-match' ? {...core, type, board: 1, boards: 1} : {...core, type};
}

const DISTRICTS: readonly District[] = [
  {
    id: 'district.core' as DistrictId,
    number: 1,
    slug: 'core',
    name: 'The Monastery',
    sectionId: SECTION_ID,
  },
  {
    id: 'district.market' as DistrictId,
    number: 2,
    slug: 'market',
    name: 'The Market',
    sectionId: SECTION_ID,
  },
];

const STOPS: readonly Stop[] = [
  stop('stop.core.c1.1', 'core'),
  stop('stop.core.c1.2', 'core'),
  stop('stop.market.c1.1', 'market'),
];

const EXERCISES: readonly Exercise[] = [
  drill('ex.core.tea', 'stop.core.c1.1', 'meaning-pick', {id: 'vocab.tea', kind: 'vocab'}),
  drill('ex.core.hello', 'stop.core.c1.1', 'phrase-recognise', {
    id: 'phrase.hello',
    kind: 'phrase',
  }),
  drill('ex.core.pairs', 'stop.core.c1.1', 'pair-match', null),
  drill('ex.core.butter', 'stop.core.c1.2', 'meaning-pick', {id: 'vocab.butter', kind: 'vocab'}),
  drill('ex.market.salt', 'stop.market.c1.1', 'meaning-pick', {id: 'vocab.salt', kind: 'vocab'}),
];

function deps(): DrillPoolDeps {
  return {
    walk: {
      listSections: async () => [],
      listDistricts: async () => DISTRICTS,
      getDistrict: async slug => {
        const district = DISTRICTS.find(candidate => candidate.slug === slug);
        if (district === undefined) {
          throw new Error(`no district ${slug}`);
        }
        return district;
      },
      getStop: async id => {
        const found = STOPS.find(candidate => candidate.id === id);
        if (found === undefined) {
          throw new Error(`no stop ${id}`);
        }
        return found;
      },
      listStopsByDistrict: async district =>
        STOPS.filter(candidate => candidate.district === district),
      listStopsBySection: async sectionId =>
        STOPS.filter(candidate => candidate.sectionId === sectionId),
      getStopScript: async () => {
        throw new Error('unused');
      },
    },
    exercises: {
      getExercise: async () => {
        throw new Error('unused');
      },
      listExercisesByStop: async id => EXERCISES.filter(candidate => candidate.stopId === id),
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

function exerciseIds(pool: {exercises: readonly Exercise[]}): string[] {
  return pool.exercises.map(exercise => exercise.id);
}

describe('the pool route codec', () => {
  it('round-trips every pool shape', () => {
    // Given
    const params = [
      'everything',
      'district:core',
      'district:core:words',
      'district:core:phrases',
      'stop:stop.core.c1.1',
      'section:speak:section.speak.1',
    ];

    // When
    const roundTripped = params.map(param => poolParam(parsePoolParam(param)));

    // Then
    expect(roundTripped).toEqual(params);
  });

  it('restores the fields a reference carries', () => {
    // When
    const district = parsePoolParam('district:core:words');
    const section = parsePoolParam('section:read:section.read.2');

    // Then
    expect(district).toEqual({kind: 'district', slug: 'core', material: 'words'});
    expect(section).toEqual({kind: 'section', sectionId: 'section.read.2', track: 'read'});
  });

  it('throws a plain message on anything that names no pool', () => {
    // Given
    const invalid = [
      '',
      'nonsense',
      'everything:all',
      'district',
      'district:',
      'district:core:letters',
      'stop:',
      'section:speak',
      'section:core:section.speak.1',
    ];

    // Then
    for (const raw of invalid) {
      expect(() => parsePoolParam(raw)).toThrow('Not a drill pool');
    }
  });
});

describe('gatherPool', () => {
  it("holds only the named district's stops' exercises, nothing padded from outside", async () => {
    // When
    const pool = await gatherPool(deps(), {kind: 'district', slug: 'core'});

    // Then — the market's drill never enters, §4.6's firewall
    expect(exerciseIds(pool)).toEqual([
      'ex.core.tea',
      'ex.core.hello',
      'ex.core.pairs',
      'ex.core.butter',
    ]);
    expect([...pool.itemsById.keys()].sort()).toEqual([
      'phrase.hello',
      'vocab.butter',
      'vocab.tea',
    ]);
  });

  it("holds only the named stop's exercises at stop scope", async () => {
    // When
    const pool = await gatherPool(deps(), {kind: 'stop', stopId: 'stop.core.c1.2' as StopId});

    // Then
    expect(exerciseIds(pool)).toEqual(['ex.core.butter']);
    expect([...pool.itemsById.keys()]).toEqual(['vocab.butter']);
  });

  it('filters a district to one material, keeping the pair boards with the words', async () => {
    // When
    const words = await gatherPool(deps(), {kind: 'district', slug: 'core', material: 'words'});

    // Then — a pair-match board runs over the stop's words, so it stays
    expect(exerciseIds(words)).toEqual(['ex.core.tea', 'ex.core.pairs', 'ex.core.butter']);
    expect([...words.itemKinds.values()].every(kind => kind === 'vocab')).toBe(true);

    // When
    const phrases = await gatherPool(deps(), {kind: 'district', slug: 'core', material: 'phrases'});

    // Then
    expect(exerciseIds(phrases)).toEqual(['ex.core.hello']);
    expect([...phrases.itemsById.keys()]).toEqual(['phrase.hello']);
  });

  it('resolves each target to its record and names the district it was met at', async () => {
    // When
    const pool = await gatherPool(deps(), {kind: 'everything'});

    // Then
    expect(pool.itemsById.get('vocab.tea')?.roman).toBe('vocab.tea');
    expect(pool.itemKinds.get('phrase.hello')).toBe('phrase');
    expect(pool.districtNameByItem.get('vocab.tea')).toBe('The Monastery');
    expect(pool.districtNameByItem.get('vocab.salt')).toBe('The Market');
  });

  it('spans every district at the everything pool', async () => {
    // When
    const pool = await gatherPool(deps(), {kind: 'everything'});

    // Then
    expect(exerciseIds(pool).sort()).toEqual([
      'ex.core.butter',
      'ex.core.hello',
      'ex.core.pairs',
      'ex.core.tea',
      'ex.market.salt',
    ]);
  });
});
