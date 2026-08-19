/**
 * @fileoverview The crossing: which words a learner can genuinely read.
 *
 * `docs/07` O9, closed 2026-08-08 as option B: a word is readable when every letter
 * is met and every rule is taught. Track-independent — the Speak roster switches the
 * *sentence*, not the count.
 *
 * The result is A FUNCTION, NEVER A STORED NUMBER (spec §10.1). Nothing here is
 * cached, and no caller may persist a count or a set computed from this file —
 * recompute from current state, never copy forward.
 *
 * The input types are structural and local on purpose: `src/domain` imports nothing
 * above it, and the coming `ReadWordSource` port will satisfy `ReadableWord` by
 * shape alone.
 */

import {lettersOf} from './tibetan';

/** A word as the crossing sees it: its script and the rules it takes to decode. */
export type ReadableWord = {
  readonly id: string;
  readonly bo: string;
  readonly ruleIds: readonly string[];
};

/** What the learner has covered so far, on either axis of O9's rule. */
export type ReadState = {
  readonly metLetterBos: ReadonlySet<string>;
  readonly taughtRuleIds: ReadonlySet<string>;
};

/**
 * The words the learner can read right now, in the order they were given.
 *
 * A word qualifies when every base letter of its `bo` is in `metLetterBos` AND every
 * id in its `ruleIds` is in `taughtRuleIds`. A word with no rules is decided by its
 * letters alone.
 *
 * @example readable([bod], {metLetterBos: new Set(['བ', 'ད']), taughtRuleIds: new Set(bod.ruleIds)})
 * // [bod]
 */
export function readable(
  words: readonly ReadableWord[],
  state: ReadState,
): readonly ReadableWord[] {
  return words.filter(word => isReadable(word, state));
}

/** O9's two conjuncts, in the order the decision states them. */
function isReadable(word: ReadableWord, state: ReadState): boolean {
  return (
    lettersOf(word.bo).every(letter => state.metLetterBos.has(letter)) &&
    word.ruleIds.every(ruleId => state.taughtRuleIds.has(ruleId))
  );
}
