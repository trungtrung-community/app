/**
 * @fileoverview The script rules TibetanText and the glyph drills both depend on.
 *
 * `docs/06` §3 names TibetanText's contract as a required test: the leading, the tsheg
 * breaking, the `roman` accessible name. The parts that are pure text logic are tested
 * here, because they are the ones that can be wrong in a way no screenshot shows — a
 * stack silently split in half still looks like Tibetan.
 *
 * What is left for a renderer test is which face, which colour and the row order, and
 * that lives in `src/components/learning/tibetan-text.test.tsx`.
 *
 * Phases are marked per `docs/11-testing-conventions.md`.
 */

import {describe, expect, it} from 'vitest';

import {
  advanceUnits,
  hasTibetan,
  lettersOf,
  lineLetters,
  needsTsheg,
  splitRuns,
  tshegBreaks,
  withTsheg,
} from './tibetan';

/** Escaped, for the reason `tibetan.ts` gives: an invisible character must be reviewable. */
const ZWSP = '\u200B';

describe('lineLetters', () => {
  it('counts a three-deep stack as one line letter', () => {
    // Given
    const value = 'བསྒྲིབས';

    // When
    const letters = lineLetters(value);

    // Then
    expect(letters).toEqual(['བ', 'སྒྲི', 'བ', 'ས']);
  });

  it('keeps a vowel with the letter it sits on', () => {
    // Given
    const value = 'སྐུ';

    // When
    const letters = lineLetters(value);

    // Then
    expect(letters).toEqual(['སྐུ']);
  });

  it('keeps a subjoined letter with its base', () => {
    // Given
    const value = 'ཀྲ';

    // When
    const letters = lineLetters(value);

    // Then
    expect(letters).toEqual(['ཀྲ']);
  });

  it('keeps a long vowel and a visarga with their stack', () => {
    // Given
    const value = 'ཧྲཱིཿ';

    // When
    const letters = lineLetters(value);

    // Then
    expect(letters).toHaveLength(1);
  });

  it('never splits a stack, which would dim half a letter', () => {
    // The reason the rule exists: character-splitting this word produces seven pieces,
    // and highlighting index 1 of those would light up part of a stack.

    // Given
    const value = 'བསྒྲིབས';

    // When
    const letters = lineLetters(value);
    const characters = Array.from(value);

    // Then
    expect(letters.length).toBeLessThan(characters.length);
  });
});

describe('advanceUnits', () => {
  it('counts a stack as one position however deep it is', () => {
    // Given
    const value = 'བསྒྲིབས';

    // When
    const units = advanceUnits(value);

    // Then
    expect(units).toBe(4);
  });

  it('counts the tsheg, which lineLetters does not', () => {
    // The two questions have different answers, and this is where they part: the tsheg
    // closes the reading position before it, so it is not a line letter — but it does
    // advance the pen, so a slot sized by line letters comes out two positions short.

    // Given
    const value = 'ཡང་བསྐྱར་';

    // When
    const units = advanceUnits(value);
    const letters = lineLetters(value);

    // Then
    expect(units).toBe(7);
    expect(letters).toHaveLength(5);
  });

  it('is unmoved by a vowel sign', () => {
    // Given
    const withVowel = 'སྐུ';
    const withSubjoined = 'ཀྲ';

    // When
    const vowelUnits = advanceUnits(withVowel);
    const subjoinedUnits = advanceUnits(withSubjoined);

    // Then
    expect(vowelUnits).toBe(1);
    expect(subjoinedUnits).toBe(1);
  });

  it('leaves Latin alone, so a mixed chunk is still measurable', () => {
    // Given
    const value = 'ka';

    // When
    const units = advanceUnits(value);

    // Then
    expect(units).toBe(2);
  });
});

describe('tshegBreaks', () => {
  it('inserts a break opportunity after every tsheg', () => {
    // Given
    const value = 'བཀྲ་ཤིས';

    // When
    const broken = tshegBreaks(value);

    // Then
    expect(broken).toBe(`བཀྲ་${ZWSP}ཤིས`);
  });

  it('adds nothing to a single syllable', () => {
    // Given
    const value = 'སྐུ';

    // When
    const broken = tshegBreaks(value);

    // Then
    expect(broken).toBe('སྐུ');
  });

  it('never inserts a break inside a stack', () => {
    // Given
    const value = 'བསྒྲིབས';

    // When
    const broken = tshegBreaks(value);

    // Then
    expect(broken).toBe('བསྒྲིབས');
    expect(broken).not.toContain(ZWSP);
  });

  it('breaks a long phrase at each of its tshegs', () => {
    // Given
    const value = 'སྤྱི་སྤྱོད་རླངས་འཁོར';

    // When
    const broken = tshegBreaks(value);

    // Then
    expect(broken.split(ZWSP)).toHaveLength(4);
  });
});

describe('needsTsheg', () => {
  it('always closes a word', () => {
    // The content set stores no trailing tsheg — 0 of 1,368 records — so the component
    // appends it and the data stays clean.

    // Given
    const value = 'བཀྲ་ཤིས';

    // When
    const needs = needsTsheg(value, 'word');

    // Then
    expect(needs).toBe(true);
  });

  it('never closes a letter or a stack specimen', () => {
    // Given
    const letter = 'ཀ';
    const stack = 'བསྒྲིབས';

    // When
    const letterNeeds = needsTsheg(letter, 'letter');
    const stackNeeds = needsTsheg(stack, 'letter');

    // Then
    expect(letterNeeds).toBe(false);
    expect(stackNeeds).toBe(false);
  });

  it('infers a multi-syllable string is a word', () => {
    // Given
    const value = 'བཀྲ་ཤིས';

    // When
    const needs = needsTsheg(value, 'auto');

    // Then
    expect(needs).toBe(true);
  });

  it('leaves a single syllable alone under auto, the one case it cannot infer', () => {
    // Given
    const value = 'ཀ';

    // When
    const needs = needsTsheg(value, 'auto');

    // Then
    expect(needs).toBe(false);
  });

  it('does not double a tsheg that is already there', () => {
    // Given
    const value = 'བཀྲ་ཤིས་';

    // When
    const needs = needsTsheg(value, 'word');

    // Then
    expect(needs).toBe(false);
  });
});

describe('hasTibetan', () => {
  it('finds Tibetan inside a Latin sentence', () => {
    // Given
    const value = 'The ད is silent';

    // When
    const found = hasTibetan(value);

    // Then
    expect(found).toBe(true);
  });

  it('is false for Latin alone', () => {
    // Given
    const value = 'trashi delek';

    // When
    const found = hasTibetan(value);

    // Then
    expect(found).toBe(false);
  });
});

describe('withTsheg', () => {
  it('closes a word', () => {
    // Given
    const value = 'བཀྲ་ཤིས';

    // When
    const closed = withTsheg(value, 'word');

    // Then
    expect(closed).toBe('བཀྲ་ཤིས་');
  });

  it('leaves a letter specimen alone', () => {
    // Given
    const value = 'ཀ';

    // When
    const closed = withTsheg(value, 'letter');

    // Then
    expect(closed).toBe('ཀ');
  });
});

describe('lettersOf', () => {
  it('reads a plain CV syllable as its one consonant', () => {
    // Given
    const value = 'བོ';

    // When
    const letters = lettersOf(value);

    // Then
    expect(letters).toEqual(['བ']);
  });

  it('maps a stack to the base letters it is built from', () => {
    // Given
    const value = 'སྒྲ';

    // When
    const letters = lettersOf(value);

    // Then
    expect(letters).toEqual(['ས', 'ག', 'ར']);
  });

  it('strips a vowel mark, which is not a letter', () => {
    // Given
    const value = 'སྐུ';

    // When
    const letters = lettersOf(value);

    // Then
    expect(letters).toEqual(['ས', 'ཀ']);
  });

  it('reads across a tsheg, keeping every syllable and dropping the separator', () => {
    // Given
    const value = 'བཀྲ་ཤིས';

    // When
    const letters = lettersOf(value);

    // Then
    expect(letters).toEqual(['བ', 'ཀ', 'ར', 'ཤ', 'ས']);
  });

  it('tolerates a trailing tsheg', () => {
    // Given
    const value = 'བོད་';

    // When
    const letters = lettersOf(value);

    // Then
    expect(letters).toEqual(['བ', 'ད']);
  });
});

describe('splitRuns', () => {
  it('separates a Tibetan word inside a Latin sentence', () => {
    // Given
    const value = 'The ད is silent';

    // When
    const runs = splitRuns(value);

    // Then
    expect(runs).toEqual([
      {tibetan: false, text: 'The '},
      {tibetan: true, text: 'ད'},
      {tibetan: false, text: ' is silent'},
    ]);
  });

  it('returns one Latin run when there is no Tibetan', () => {
    // Given
    const value = 'trashi delek';

    // When
    const runs = splitRuns(value);

    // Then
    expect(runs).toEqual([{tibetan: false, text: 'trashi delek'}]);
  });
});
