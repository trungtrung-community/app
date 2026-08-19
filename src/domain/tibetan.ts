/**
 * @fileoverview Facts about the Tibetan script, as pure functions.
 *
 * These live in the domain rather than inside `TibetanText` because they are not
 * presentation. What counts as one letter the eye reads is a property of uchen, and
 * the glyph and stack drills need the same answer the renderer does — `spot-it` and
 * `sort-what-changed` are about exactly this. A copy inside a component would be a
 * second opinion about the script.
 *
 * No React, no React Native, no platform: these run in a plain test process.
 */

/** The syllable separator. A Tibetan word ends in one. */
export const TSHEG = '\u0F0B';

/** Zero-width space. Tibetan may break after a tsheg and nowhere else. */
export const ZWSP = '\u200B';

/**
 * Every code point below is written as an escape on purpose.
 *
 * These are combining marks and subjoined letters: invisible on their own, and
 * indistinguishable from each other in a literal character class, where a mistyped
 * range silently swallows the base consonants and collapses every word to one unit.
 * Escapes are the only form that can be reviewed.
 */

/** Tibetan ends a syllable on a consonant or a subjoined letter. */
const TIB_LETTER_END = /[\u0F40-\u0FBC]$/;

/**
 * Characters that attach to the letter before them.
 *
 * The tsheg (U+0F0B) is included: it closes the reading position it follows rather
 * than starting a new one. Then the marks above and below, the vowel signs
 * (U+0F71–U+0F87) and the subjoined consonants (U+0F8D–U+0FBC).
 */
const TIB_ATTACH = /[\u0F0B-\u0F0E\u0F35\u0F37\u0F39\u0F71-\u0F87\u0F8D-\u0FBC]/;

/** The whole Tibetan block. */
const TIB_ANY = /[\u0F00-\u0FFF]/;

/** One or more Tibetan glyphs, plus the separators between a list of them. */
const TIB_RUN = /([\u0F00-\u0FFF]+(?:[ \u00B7\u2022]+[\u0F00-\u0FFF]+)*)/g;

/** True when the string carries any Tibetan. */
export function hasTibetan(value: string): boolean {
  return TIB_ANY.test(value);
}

/**
 * Split a string into line letters.
 *
 * A LINE LETTER is a position the eye reads, not a character: a base consonant plus
 * anything subjoined to it and any vowel mark is ONE line letter.
 *
 * @example lineLetters('བསྒྲིབས') // ['བ', 'སྒྲི', 'བ', 'ས'] — four, not seven
 */
export function lineLetters(value: string): string[] {
  const out: string[] = [];
  let current = '';
  for (const character of Array.from(value)) {
    if (current && !TIB_ATTACH.test(character)) {
      out.push(current);
      current = character;
    } else {
      current += character;
    }
  }
  if (current) {
    out.push(current);
  }
  return out;
}

/**
 * Characters that stack above or below the letter they belong to.
 *
 * `TIB_ATTACH` without the tsheg and the other punctuation, because those two questions
 * have different answers: the tsheg closes the reading position before it, so it is not a
 * line letter of its own — but it does advance the pen, so it does take width.
 */
const TIB_STACKING = /[\u0F71-\u0F87\u0F8D-\u0FBC]/g;

/**
 * How many positions a run of Tibetan advances across the page.
 *
 * Base letters and the tsheg each take one; vowel signs and subjoined letters stack and
 * take none. This is what a fixed-width slot has to be sized by — `lineLetters` counts
 * something different and would size `ཡང་བསྐྱར་` two positions short.
 *
 * @example advanceUnits('བསྒྲིབས') // 4 — the same as its line letters
 * @example advanceUnits('ཡང་བསྐྱར་') // 7 — two more, because both tshegs take width
 */
export function advanceUnits(value: string): number {
  return value.replace(TIB_STACKING, '').length;
}

/** Insert a break opportunity after every tsheg, and nowhere else. */
export function tshegBreaks(value: string): string {
  return value.split(TSHEG).join(TSHEG + ZWSP);
}

/**
 * What a string IS, which decides whether it closes with a tsheg.
 *
 * `word` always closes. `letter` never does, because a letter or a stack specimen has
 * no syllable to close. `auto` closes only a string that is already multi-syllable,
 * which is the one case it can infer safely.
 */
export type TibetanUnit = 'word' | 'letter' | 'auto';

/**
 * Whether this string should render a trailing tsheg.
 *
 * The content set stores none — 0 of 1,368 records — so it is appended at render time
 * and the data stays clean. One place to change it, forever.
 */
export function needsTsheg(value: string, unit: TibetanUnit): boolean {
  if (unit === 'letter') {
    return false;
  }
  return (unit === 'word' || value.indexOf(TSHEG) > 0) && TIB_LETTER_END.test(value);
}

/** The string with its trailing tsheg, if the unit calls for one. */
export function withTsheg(value: string, unit: TibetanUnit): string {
  return needsTsheg(value, unit) ? value + TSHEG : value;
}

/**
 * The subjoined consonants that mirror a base letter at a fixed distance.
 *
 * Unicode lays U+0F90–U+0FB8 out parallel to the base block, so subtracting this
 * offset turns a subjoined letter into the letter it is a form of: ྒ (U+0F92)
 * becomes ག (U+0F42).
 */
const SUBJOINED_FIRST = 0x0f90;
const SUBJOINED_LAST = 0x0fb8;
const SUBJOINED_TO_BASE = 0x50;

/**
 * The three fixed-form subjoined letters sit past the parallel run, so the offset
 * would land them on the wrong base. Each is named here with the letter it writes.
 */
const FIXED_FORM_BASE: ReadonlyMap<string, string> = new Map([
  ['\u0FBA', '\u0F5D'], // fixed-form wa → ཝ
  ['\u0FBB', '\u0F61'], // fixed-form ya → ཡ
  ['\u0FBC', '\u0F62'], // fixed-form ra → ར
]);

/** A base consonant: the block's on-the-line letters, U+0F40–U+0F6C. */
const TIB_BASE = /[\u0F40-\u0F6C]/;

/**
 * Every base letter a word uses, in writing order, duplicates kept.
 *
 * This is the decomposition the Read track's crossing is computed from: a word is
 * only readable once each of these letters has been met. Subjoined letters map to
 * the base letter they are a form of, because meeting ར is meeting ྲ. Vowel signs
 * and marks are not letters and are dropped, and so are the tsheg and the shad —
 * only consonants survive, so no separate splitting step is needed. Prefixes,
 * suffixes and superscripts are already plain letters and pass through unchanged.
 *
 * @example lettersOf('སྒྲ') // ['ས', 'ག', 'ར'] — the subjoined pair mapped to base
 * @example lettersOf('བཀྲ་ཤིས') // ['བ', 'ཀ', 'ར', 'ཤ', 'ས'] — the tsheg drops out
 */
export function lettersOf(bo: string): readonly string[] {
  const letters: string[] = [];
  for (const character of Array.from(bo)) {
    const code = character.codePointAt(0) ?? 0;
    const fixedForm = FIXED_FORM_BASE.get(character);
    if (code >= SUBJOINED_FIRST && code <= SUBJOINED_LAST) {
      letters.push(String.fromCodePoint(code - SUBJOINED_TO_BASE));
    } else if (fixedForm !== undefined) {
      letters.push(fixedForm);
    } else if (TIB_BASE.test(character)) {
      letters.push(character);
    }
  }
  return letters;
}

/**
 * Split a mixed string into its Tibetan and Latin runs, in order.
 *
 * For strings that arrive as props and cannot be wrapped at the call site — a
 * RailNode label, a Sheet title. Returns a single Latin run when there is no
 * Tibetan, so callers need no special case.
 *
 * @example splitRuns('The ད is silent')
 * // [{tibetan: false, text: 'The '}, {tibetan: true, text: 'ད'}, …]
 */
export function splitRuns(value: string): {tibetan: boolean; text: string}[] {
  return value
    .split(TIB_RUN)
    .filter(Boolean)
    .map(text => ({tibetan: hasTibetan(text), text}));
}
