/**
 * @fileoverview The crossing's derivation: letters met from the snapshot, rules
 * taught by completed Read stops, and the composition into readable words. The
 * doubles carry one Read section whose single stop teaches two rules and
 * reprises a third. Phases per docs/11.
 */

import {describe, expect, it, vi} from 'vitest';

import type {LetterId, ReadRuleId, ReadWordId, SectionId, StopId} from '../ports/content-ids';
import type {Letter, ReadWord, Section, Stop, StopPosition} from '../ports/content-model';
import type {Progress} from '../ports/progress-store';

import {markTaught, newItem, type ItemId} from '../domain/item';
import {deriveReadState, readableWords, type ReadableWordsDeps} from './read-progress';

const EMPTY: Progress = {walkedOn: [], items: {}, completedStops: [], version: 2};

function letter(id: string, bo: string): Letter {
  return {
    id: id as LetterId,
    subtype: 'consonant',
    bo,
    wylie: null,
    name: null,
    nameBo: null,
    romanization: null,
    section: 2,
    row: null,
    column: null,
    columnName: null,
    series: null,
    mark: null,
    markCodePoint: null,
    carrier: null,
    position: null,
    exampleSyllable: null,
    value: null,
    speakRef: null,
    recognitionOnly: false,
    mirrors: null,
    audio: null,
    confusables: [],
  };
}

function stop(id: string, sectionId: string): Stop {
  return {
    id: id as StopId,
    track: 'read',
    district: null,
    sectionId: sectionId as SectionId,
    ordinal: 1,
    circuit: null,
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

function word(id: string, bo: string, ruleIds: readonly string[]): ReadWord {
  return {
    id: id as ReadWordId,
    bo,
    wylie: null,
    reading: null,
    romanization: null,
    glosses: [],
    syllables: [bo],
    decodable: true,
    readableFromSection: null,
    section: 2,
    speakRef: null,
    illustration: null,
    audio: null,
    ruleIds: ruleIds as readonly ReadRuleId[],
  };
}

const SECTION: Section = {
  id: 'section.read.1' as SectionId,
  track: 'read',
  number: 1,
  name: 'The thirty',
  nameBo: null,
  outcome: null,
};

const SCRIPT: readonly StopPosition[] = [
  {
    stopId: 'stop.1.1' as StopId,
    n: 1,
    screen: null,
    kind: 'rule-card',
    ruleId: 'R-A' as ReadRuleId,
    text: '',
  },
  {
    stopId: 'stop.1.1' as StopId,
    n: 2,
    screen: null,
    kind: 'rule-statement',
    ruleId: 'R-B' as ReadRuleId,
    text: '',
    wantsACard: false,
  },
  {
    stopId: 'stop.1.1' as StopId,
    n: 3,
    screen: null,
    kind: 'rule-reprise',
    ruleId: 'R-C' as ReadRuleId,
    text: '',
  },
];

/** One Read section, one stop, two letters, two words — and every call counted. */
function deps() {
  const listLetters = vi.fn(async () => [letter('letter.ka', 'ཀ'), letter('letter.ja', 'ཇ')]);
  const listSections = vi.fn(async () => [SECTION]);
  const listStopsBySection = vi.fn(async () => [stop('stop.1.1', 'section.read.1')]);
  const getStopScript = vi.fn(async () => SCRIPT);
  const listReadWords = vi.fn(async () => [
    word('word.ka', 'ཀ', ['R-A']),
    word('word.ja', 'ཇ', ['R-A', 'R-Z']),
  ]);
  const fail = (name: string) => async () => {
    throw new Error(`unused: ${name}`);
  };
  const built: ReadableWordsDeps = {
    walk: {
      listSections,
      listDistricts: fail('listDistricts'),
      getDistrict: fail('getDistrict'),
      getStop: fail('getStop'),
      listStopsByDistrict: fail('listStopsByDistrict'),
      listStopsBySection,
      getStopScript,
    },
    script: {
      listLetters,
      getLetter: fail('getLetter'),
      listReadRules: fail('listReadRules'),
      getReadRule: fail('getReadRule'),
    },
    words: {
      listReadWords,
      getReadWord: fail('getReadWord'),
    },
  };
  return {built, listLetters, getStopScript, listReadWords};
}

function met(id: string) {
  return markTaught(newItem(id as ItemId));
}

describe('deriveReadState', () => {
  it('collects the bo of every letter item the snapshot has met', async () => {
    // Given
    const {built} = deps();
    const progress: Progress = {
      ...EMPTY,
      items: {
        'letter.ka': met('letter.ka'),
        'letter.ja': newItem('letter.ja' as ItemId),
        'vocab.tea': met('vocab.tea'),
        'letter.gone': met('letter.gone'),
      },
    };

    // When
    const state = await deriveReadState(built, progress);

    // Then
    expect([...state.metLetterBos]).toEqual(['ཀ']);
  });

  it('collects rules from rule-card and rule-statement positions of completed Read stops', async () => {
    // Given
    const {built, getStopScript} = deps();
    const progress: Progress = {
      ...EMPTY,
      completedStops: ['stop.core.c1.1', 'stop.1.1'],
    };

    // When
    const state = await deriveReadState(built, progress);

    // Then
    expect([...state.taughtRuleIds].sort()).toEqual(['R-A', 'R-B']);
    expect(getStopScript).toHaveBeenCalledTimes(1);
    expect(getStopScript).toHaveBeenCalledWith('stop.1.1');
  });

  it('derives the rules once per completedStops identity', async () => {
    // Given
    const {built, getStopScript} = deps();
    const progress: Progress = {...EMPTY, completedStops: ['stop.1.1']};

    // When
    await deriveReadState(built, progress);
    await deriveReadState(built, progress);
    await deriveReadState(built, {...progress, completedStops: [...progress.completedStops]});

    // Then
    expect(getStopScript).toHaveBeenCalledTimes(2);
  });

  it('answers a null snapshot as a first launch, without reading the source', async () => {
    // When
    const {built, listLetters, getStopScript} = deps();
    const state = await deriveReadState(built, null);

    // Then
    expect(state.metLetterBos.size).toBe(0);
    expect(state.taughtRuleIds.size).toBe(0);
    expect(listLetters).not.toHaveBeenCalled();
    expect(getStopScript).not.toHaveBeenCalled();
  });
});

describe('readableWords', () => {
  it('answers the words whose letters are met and rules taught', async () => {
    // Given
    const {built} = deps();
    const progress: Progress = {
      ...EMPTY,
      items: {'letter.ka': met('letter.ka'), 'letter.ja': met('letter.ja')},
      completedStops: ['stop.1.1'],
    };

    // When
    const words = await readableWords(built, progress);

    // Then — word.ja also needs R-Z, which nothing taught
    expect(words.map(w => w.id)).toEqual(['word.ka']);
  });

  it('answers empty with no letters met, without listing a word', async () => {
    // Given
    const {built, listReadWords} = deps();

    // When
    const words = await readableWords(built, EMPTY);

    // Then
    expect(words).toEqual([]);
    expect(listReadWords).not.toHaveBeenCalled();
  });
});
