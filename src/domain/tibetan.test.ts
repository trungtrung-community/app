/**
 * @fileoverview The script rules TibetanText and the glyph drills both depend on.
 *
 * `docs/06` §3 names TibetanText's contract as a required test: the leading, the tsheg
 * breaking, the `roman` accessible name. The parts that are pure text logic are tested
 * here, because they are the ones that can be wrong in a way no screenshot shows — a
 * stack silently split in half still looks like Tibetan.
 *
 * What is left for a renderer test is which face, which colour and the row order, and
 * that arrives with the React Native transform setup docs/06 anticipates.
 */

import {describe, expect, it} from 'vitest';

import {
  advanceUnits,
  hasTibetan,
  lineLetters,
  needsTsheg,
  splitRuns,
  tshegBreaks,
  withTsheg,
} from './tibetan';

const ZWSP = '​';

describe('lineLetters', () => {
  it('counts a three-deep stack as one line letter', () => {
    // བསྒྲིབས is four line letters — བ · སྒྲི · བ · ས — not seven characters.
    expect(lineLetters('བསྒྲིབས')).toEqual(['བ', 'སྒྲི', 'བ', 'ས']);
  });

  it('keeps a vowel with the letter it sits on', () => {
    expect(lineLetters('སྐུ')).toEqual(['སྐུ']);
  });

  it('keeps a subjoined letter with its base', () => {
    expect(lineLetters('ཀྲ')).toEqual(['ཀྲ']);
  });

  it('keeps a long vowel and a visarga with their stack', () => {
    expect(lineLetters('ཧྲཱིཿ')).toHaveLength(1);
  });

  it('never splits a stack, which would dim half a letter', () => {
    // The reason the rule exists: character-splitting བསྒྲིབས would produce seven
    // pieces and highlighting index 1 would light up part of a stack.
    expect(lineLetters('བསྒྲིབས').length).toBeLessThan(Array.from('བསྒྲིབས').length);
  });
});

describe('advanceUnits', () => {
  it('counts a stack as one position however deep it is', () => {
    expect(advanceUnits('བསྒྲིབས')).toBe(4);
  });

  it('counts the tsheg, which lineLetters does not', () => {
    // The two questions have different answers, and this is where they part: the tsheg
    // closes the reading position before it, so it is not a line letter — but it does
    // advance the pen, so a slot sized by line letters comes out two positions short.
    expect(advanceUnits('ཡང་བསྐྱར་')).toBe(7);
    expect(lineLetters('ཡང་བསྐྱར་')).toHaveLength(5);
  });

  it('is unmoved by a vowel sign', () => {
    expect(advanceUnits('སྐུ')).toBe(1);
    expect(advanceUnits('ཀྲ')).toBe(1);
  });

  it('leaves Latin alone, so a mixed chunk is still measurable', () => {
    expect(advanceUnits('ka')).toBe(2);
  });
});

describe('tshegBreaks', () => {
  it('inserts a break opportunity after every tsheg', () => {
    expect(tshegBreaks('བཀྲ་ཤིས')).toBe(`བཀྲ་${ZWSP}ཤིས`);
  });

  it('adds nothing to a single syllable', () => {
    expect(tshegBreaks('སྐུ')).toBe('སྐུ');
  });

  it('never inserts a break inside a stack', () => {
    const broken = tshegBreaks('བསྒྲིབས');
    expect(broken).toBe('བསྒྲིབས');
    expect(broken).not.toContain(ZWSP);
  });

  it('breaks a long phrase at each of its tshegs', () => {
    const value = 'སྤྱི་སྤྱོད་རླངས་འཁོར';
    expect(tshegBreaks(value).split(ZWSP)).toHaveLength(4);
  });
});

describe('needsTsheg', () => {
  it('always closes a word', () => {
    // The content set stores no trailing tsheg — 0 of 1,368 records — so the
    // component appends it and the data stays clean.
    expect(needsTsheg('བཀྲ་ཤིས', 'word')).toBe(true);
  });

  it('never closes a letter or a stack specimen', () => {
    expect(needsTsheg('ཀ', 'letter')).toBe(false);
    expect(needsTsheg('བསྒྲིབས', 'letter')).toBe(false);
  });

  it('infers a multi-syllable string is a word', () => {
    expect(needsTsheg('བཀྲ་ཤིས', 'auto')).toBe(true);
  });

  it('leaves a single syllable alone under auto, the one case it cannot infer', () => {
    expect(needsTsheg('ཀ', 'auto')).toBe(false);
  });

  it('does not double a tsheg that is already there', () => {
    expect(needsTsheg('བཀྲ་ཤིས་', 'word')).toBe(false);
  });
});

describe('hasTibetan', () => {
  it('finds Tibetan inside a Latin sentence', () => {
    expect(hasTibetan('The ད is silent')).toBe(true);
  });

  it('is false for Latin alone', () => {
    expect(hasTibetan('trashi delek')).toBe(false);
  });
});

describe('withTsheg', () => {
  it('closes a word', () => {
    expect(withTsheg('བཀྲ་ཤིས', 'word')).toBe('བཀྲ་ཤིས་');
  });

  it('leaves a letter specimen alone', () => {
    expect(withTsheg('ཀ', 'letter')).toBe('ཀ');
  });
});

describe('splitRuns', () => {
  it('separates a Tibetan word inside a Latin sentence', () => {
    expect(splitRuns('The ད is silent')).toEqual([
      {tibetan: false, text: 'The '},
      {tibetan: true, text: 'ད'},
      {tibetan: false, text: ' is silent'},
    ]);
  });

  it('returns one Latin run when there is no Tibetan', () => {
    expect(splitRuns('trashi delek')).toEqual([{tibetan: false, text: 'trashi delek'}]);
  });
});
