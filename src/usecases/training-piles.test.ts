/**
 * @fileoverview The pile registry binds to its sources and gates by section —
 * docs/03 §4.3: "An item enters its pile only after the stop that teaches it."
 * The double is the four narrow capabilities, as in drill-pool.test.ts. Phases
 * per docs/11.
 */

import {describe, expect, it} from 'vitest';

import type {
  LetterId,
  ReadWordId,
  SectionId,
  StackId,
  StopId,
  SyllableId,
} from '../ports/content-ids';
import type {
  Letter,
  ReadWord,
  Section,
  Stack,
  StackSlots,
  Stop,
  Syllable,
} from '../ports/content-model';

import {drawPile, pileCounts, readSectionCeiling, type TrainingPileSources} from './training-piles';

const SLOTS: StackSlots = {
  prefix: null,
  superscript: null,
  root: 'ཀ',
  subscript: null,
  vowel: null,
  suffix: null,
  suffix2: null,
};

function letter(id: string, section: number, name: string | null = 'ka'): Letter {
  return {
    id: id as LetterId,
    subtype: 'consonant',
    bo: 'ཀ',
    wylie: `${id}-wylie`,
    name,
    nameBo: null,
    romanization: 'trungtrung',
    section,
    row: 1,
    column: 1,
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
    audio: {path: `audio/${id}.m4a`, available: false},
    confusables: [],
  };
}

function stack(id: string, section: number): Stack {
  return {
    id: id as StackId,
    bo: 'རྐ',
    wylie: 'rka',
    root: 'ཀ',
    rootIndex: 1,
    affix: null,
    group: 'superscript',
    reading: `${id}-reading`,
    romanization: 'trungtrung',
    ambiguous: false,
    readsAlsoAs: [],
    attested: null,
    section,
    slots: SLOTS,
    audio: null,
    ruleIds: [],
  };
}

function syllable(id: string, family: string, section: number): Syllable {
  return {
    id: id as SyllableId,
    bo: 'ཀི',
    wylie: 'ki',
    root: 'ཀ',
    rootIndex: 0,
    vowel: 'ི',
    family,
    reading: `${id}-reading`,
    romanization: 'trungtrung',
    ambiguous: false,
    demonstrates: null,
    sourceNote: null,
    section,
    slots: SLOTS,
    audio: null,
    ruleIds: [],
    forms: [],
  };
}

function readWord(id: string, section: number): ReadWord {
  return {
    id: id as ReadWordId,
    bo: 'ཨ་ཅག',
    wylie: null,
    reading: `${id}-reading`,
    romanization: 'trungtrung',
    glosses: ['elder sister'],
    syllables: ['ཨ', 'ཅག'],
    decodable: true,
    readableFromSection: null,
    section,
    speakRef: null,
    illustration: null,
    audio: {path: `audio/${id}.m4a`, available: false},
    ruleIds: [],
  };
}

type SourceRows = {
  letters?: readonly Letter[];
  stacks?: readonly Stack[];
  syllables?: readonly Syllable[];
  words?: readonly ReadWord[];
};

function sources({
  letters = [],
  stacks = [],
  syllables = [],
  words = [],
}: SourceRows): TrainingPileSources {
  return {
    listLetters: async () => letters,
    getLetter: async () => {
      throw new Error('not in this test');
    },
    listReadRules: async () => [],
    getReadRule: async () => {
      throw new Error('not in this test');
    },
    listStacks: async () => stacks,
    getStack: async () => {
      throw new Error('not in this test');
    },
    listSyllables: async (family, maxSection) =>
      syllables.filter(row => row.family === family && row.section <= maxSection),
    countSyllables: async (family, maxSection) =>
      syllables.filter(row => row.family === family && row.section <= maxSection).length,
    getSyllable: async () => {
      throw new Error('not in this test');
    },
    listReadWords: async () => words,
    getReadWord: async () => {
      throw new Error('not in this test');
    },
  };
}

function readSection(number: number): Section {
  return {
    id: `section.read.${number}` as SectionId,
    track: 'read',
    number,
    name: `Section ${number}`,
    nameBo: null,
    outcome: null,
  };
}

function readStop(id: string, sectionNumber: number, track: 'read' | 'speak' = 'read'): Stop {
  return {
    id: id as StopId,
    track,
    district: track === 'speak' ? 'core' : null,
    sectionId: `section.${track}.${sectionNumber}` as SectionId,
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

describe('pileCounts', () => {
  it('shows a section-1 learner the thirty but not the ending grid', async () => {
    // Given
    const deps = sources({
      letters: [letter('letter.ka', 1), letter('letter.kha', 1)],
      syllables: [syllable('syllable.kas', 'ending-grid', 8)],
    });

    // When
    const piles = await pileCounts(deps, 1);

    // Then
    expect(piles.map(pile => pile.id)).toEqual(['the-thirty']);
    expect(piles[0]?.count).toBe(2);
  });

  it('leaves an untaught pile absent, never present at zero', async () => {
    // Given
    const deps = sources({
      letters: [letter('letter.ka', 1)],
      stacks: [stack('stack.rka', 3)],
    });

    // When
    const piles = await pileCounts(deps, 2);

    // Then
    expect(piles.find(pile => pile.id === 'stacks')).toBeUndefined();
  });

  it('counts every pile from its own source, each in its own unit', async () => {
    // Given
    const deps = sources({
      letters: [letter('letter.ka', 1)],
      stacks: [stack('stack.rka', 2), stack('stack.rga', 2)],
      syllables: [
        syllable('syllable.ki', 'grid', 1),
        syllable('syllable.rki', 'stack-grid', 2),
        syllable('syllable.kas', 'demo', 2),
        syllable('syllable.gag', 'ending-grid', 2),
        syllable('syllable.w1', 'worked', 2),
        syllable('syllable.c1', 'corpus', 2),
      ],
      words: [readWord('word.a-cag', 2)],
    });

    // When
    const piles = await pileCounts(deps, 2);

    // Then
    expect(piles).toEqual([
      {id: 'the-thirty', title: 'The thirty', unit: 'letters', count: 1},
      {id: 'letter-vowel', title: 'Letter × vowel', unit: 'syllables', count: 1},
      {id: 'stacks', title: 'Stacks', unit: 'stacks', count: 2},
      {id: 'stack-vowel', title: 'Stacks × vowel', unit: 'syllables', count: 1},
      {id: 'endings', title: 'Endings', unit: 'syllables', count: 1},
      {id: 'ending-grid', title: 'Every root, every ending', unit: 'syllables', count: 1},
      // `worked` and `corpus` are one pile, per §4.3's "real syllables" row.
      {id: 'real-syllables', title: 'Real syllables', unit: 'syllables', count: 2},
      {id: 'whole-words', title: 'Whole words', unit: 'words', count: 1},
    ]);
  });
});

describe('drawPile', () => {
  it('shuffles by the injected rng', async () => {
    // Given
    const deps = sources({
      letters: [letter('letter.a', 1, 'a'), letter('letter.b', 1, 'b'), letter('letter.c', 1, 'c')],
    });

    // When
    // Fisher–Yates with rng always 0 swaps every position through index 0.
    const cards = await drawPile(deps, 'the-thirty', 1, () => 0);

    // Then
    expect(cards.map(card => card.reading)).toEqual(['b', 'c', 'a']);
  });

  it('gates the drawn cards by section like the counts', async () => {
    // Given
    const deps = sources({
      words: [readWord('word.early', 2), readWord('word.late', 7)],
    });

    // When
    const cards = await drawPile(deps, 'whole-words', 2, () => 0);

    // Then
    expect(cards).toHaveLength(1);
    expect(cards[0]?.reading).toBe('word.early-reading');
  });

  it('carries what the reveal needs: reading, gloss and the recording', async () => {
    // Given
    const deps = sources({words: [readWord('word.a-cag', 2)]});

    // When
    const [card] = await drawPile(deps, 'whole-words', 2, () => 0);

    // Then
    expect(card).toEqual({
      bo: 'ཨ་ཅག',
      reading: 'word.a-cag-reading',
      gloss: 'elder sister',
      audio: {path: 'audio/word.a-cag.m4a', available: false},
    });
  });

  it('falls back to the wylie for a letter the content has not named', async () => {
    // Given
    const deps = sources({letters: [letter('letter.ka', 1, null)]});

    // When
    const [card] = await drawPile(deps, 'the-thirty', 1, () => 0);

    // Then
    expect(card?.reading).toBe('letter.ka-wylie');
  });
});

describe('readSectionCeiling', () => {
  const SECTIONS = [readSection(1), readSection(2), readSection(6)];

  it('is the highest Read section among the completed stops', () => {
    // Given
    const completed = [readStop('stop.1.1', 1), readStop('stop.6.1', 6)];

    // When
    const ceiling = readSectionCeiling(SECTIONS, completed);

    // Then
    expect(ceiling).toBe(6);
  });

  it('ignores Speak stops — they open no Read pile', () => {
    // Given
    const completed = [readStop('stop.core.c1.1', 1, 'speak')];

    // When
    const ceiling = readSectionCeiling(SECTIONS, completed);

    // Then
    expect(ceiling).toBe(0);
  });

  it('is zero before any stop is done, which empties every pile', () => {
    // Given

    // When
    const ceiling = readSectionCeiling(SECTIONS, []);

    // Then
    expect(ceiling).toBe(0);
  });
});
