/**
 * @fileoverview The drill mode registry — docs/03 §4.6's second parameter.
 *
 * A mode is drawn only when the set can fill it, and it carries its count in
 * its own unit — cards, questions, boards. Below its minimum fill, or with
 * nothing eligible, it is ABSENT from the picker: never greyed, never locked,
 * never "coming soon" (docs/01 forbids all three).
 *
 * The OCP seam: audio day adds a listen mode as one more array element — its
 * own eligibility, its own fill — and no switch is edited, because
 * `availableModes` walks the array and asks each mode about itself.
 *
 * Titles are the board's (V3/E3/Q8, reconciled 2026-08-19): our
 * word-recognise is the board's "Listen and pick" — the mode that runs the
 * meaning-picks and their audio-blocked listen-pick siblings — and
 * phrase-recognise is "Listen and pick, phrases". The board's other cards
 * ("Find the word", "Order what you heard", "Complete what you heard",
 * "Say it") name modes without a v1 runner and are absent, never placeholder
 * rows.
 */

import type {Exercise} from '../ports/content-exercise';

import type {DrillSet} from './drill-pool';

export type DrillModeId = 'flashcards' | 'word-recognise' | 'phrase-recognise' | 'pair-match';

/**
 * One way to practise a set.
 *
 * `minFill` is in distinct items and is per mode, not global (§4.6). `fill`
 * reports the mode's count over a whole set, in the mode's own `unit`, and
 * returns 0 when the set holds nothing the mode can run.
 */
export type DrillMode = {
  readonly id: DrillModeId;
  readonly title: string;
  readonly unit: 'cards' | 'questions' | 'boards';
  readonly material: 'words' | 'phrases' | 'both';
  /** Which runner drives it: the exercise engine, or the flashcard deck. */
  readonly runner: 'engine' | 'flashcards';
  readonly minFill: number;
  readonly eligible: (exercise: Exercise) => boolean;
  readonly fill: (set: DrillSet) => number;
};

/**
 * The same substitution the stop planner performs: a listen-pick blocked on
 * audio runs as its silent meaning-pick sibling (docs/03 §7 A2), so it counts
 * toward recognition; an unblocked one has no renderer yet and does not —
 * counting it would make the picker's number a lie.
 */
const wordRecogniseEligible = (exercise: Exercise): boolean =>
  exercise.type === 'meaning-pick' ||
  (exercise.type === 'listen-pick' && exercise.blockedOn === 'audio');

/** Blocked phrase-recognise runs from the script (§7); unblocked has no player yet. */
const phraseRecogniseEligible = (exercise: Exercise): boolean =>
  exercise.type === 'phrase-recognise' && exercise.blockedOn === 'audio';

const pairMatchEligible = (exercise: Exercise): boolean => exercise.type === 'pair-match';

/** Five distinct pairs per board — docs/03 §7 V13's minimum. */
const PAIRS_PER_BOARD = 5;

export const DRILL_MODES: readonly DrillMode[] = [
  {
    id: 'flashcards',
    title: 'Flashcards',
    unit: 'cards',
    material: 'both',
    runner: 'flashcards',
    minFill: 1,
    // The deck runs over items, not exercises, so any set with an item fills it.
    eligible: () => true,
    fill: set => set.itemIds.length,
  },
  {
    id: 'word-recognise',
    title: 'Listen and pick',
    unit: 'questions',
    material: 'words',
    runner: 'engine',
    minFill: 1,
    eligible: wordRecogniseEligible,
    fill: set => set.exercises.filter(wordRecogniseEligible).length,
  },
  {
    id: 'phrase-recognise',
    title: 'Listen and pick, phrases',
    unit: 'questions',
    material: 'phrases',
    runner: 'engine',
    minFill: 1,
    eligible: phraseRecogniseEligible,
    fill: set => set.exercises.filter(phraseRecogniseEligible).length,
  },
  {
    id: 'pair-match',
    title: 'Match the pairs',
    unit: 'boards',
    material: 'words',
    runner: 'engine',
    minFill: PAIRS_PER_BOARD,
    eligible: pairMatchEligible,
    fill: set =>
      set.exercises.some(pairMatchEligible) ? Math.ceil(set.itemIds.length / PAIRS_PER_BOARD) : 0,
  },
];

/**
 * The modes a set can offer, each with its count in its own unit.
 *
 * A mode below its minimum fill, or whose fill is zero, is absent from the
 * result — absence is honest and needs no explanation (§4.6).
 */
export function availableModes(set: DrillSet): readonly {mode: DrillMode; count: number}[] {
  const drawn: {mode: DrillMode; count: number}[] = [];
  for (const mode of DRILL_MODES) {
    if (set.itemIds.length < mode.minFill) {
      continue;
    }
    const count = mode.fill(set);
    if (count > 0) {
      drawn.push({mode, count});
    }
  }
  return drawn;
}
