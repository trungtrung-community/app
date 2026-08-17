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
