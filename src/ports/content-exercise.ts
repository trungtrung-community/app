/**
 * @fileoverview Every kind of drill, as one discriminated union.
 *
 * Sixteen exercise types across the two tracks, and they genuinely differ. A
 * `listen-pick` needs four options and a recording; a `build-the-stack` needs seven
 * slots and four chip trays; a `phrase-arrange` needs nothing at all beyond the
 * chunks of the phrase it targets. A single type wide enough to hold all of them
 * would be optional everywhere and would let a renderer read a field the exercise it
 * is drawing does not have.
 *
 * So the union is discriminated on `type`, and the mapper that builds it switches
 * exhaustively. A seventeenth exercise type in the content widens the generated
 * payload union, the switch stops being exhaustive, and the app fails to compile —
 * which is the whole point, and is the same guarantee a renamed column already has.
 *
 * The storage side is a shared row plus a small JSON remainder. Eight of the sixteen
 * types have an empty remainder, because the shared columns and the option and chunk
 * tables already carry everything they need. That is the normalisation working, not
 * a gap.
 */

import type {ContentItemId, ExerciseId, ItemRef, StopId, Track} from './content-ids';
import type {ChangePair, Chunk} from './content-model';

/**
 * How a drill is operated, from `docs/03` §1.
 *
 * The family decides the renderer; the type decides what is being asked. Several
 * types share a family on purpose — `listen-pick` and `meaning-pick` are both four
 * tappable text options, and drawing them with one component is why the family is
 * modelled at all.
 */
export type ExerciseFamily =
  | 'tap-select (text)'
  | 'tap-select (chip)'
  | 'tap-select (glyph)'
  | 'tap-select (gloss)'
  | 'tap-select (position)'
  | 'multi-select'
  | 'pair-match'
  | 'chip-arrange'
  | 'assembly'
  | 'record-compare';

/**
 * One answer choice.
 *
 * **Returned in stored order, and the caller must shuffle.** For every Speak
 * exercise the answer is stored first — all 4,164 of them — because the content
 * build stores the true order and leaves shuffling to run time. A renderer that
 * draws them as stored puts the answer first in every Speak exercise in the product.
 * The Read track's options are already varied, which makes this easy to miss by
 * testing the wrong track.
 *
 * Shuffling belongs to `src/engine`, with an injected source of randomness, so that
 * the shuffle can be asserted rather than hoped for.
 */
export type ExerciseOption = {
  readonly ordinal: number;
  readonly itemId: ContentItemId;
  /** What to draw, where the option is not drawn from the item's own fields. */
  readonly label: string | null;
  readonly isAnswer: boolean;
};

/**
 * A chunk the exercise supplies, and what it is there for.
 *
 * Only the pieces that are NOT already derivable. The right answer is always the
 * target phrase's own chunks, so an arrange exercise stores its `decoy` chips and a
 * cloze exercise stores the `candidate` chunks that do not fill the gap. Nothing
 * here duplicates the phrase.
 */
export type ExerciseChunkRef = {
  readonly ordinal: number;
  readonly role: 'candidate' | 'decoy';
  readonly chunk: Chunk;
};

/** What the learner is shown or played before answering. */
export type ExercisePrompt = {
  /**
   * The planned path of the recording to play.
   *
   * Whether that recording exists is the target item's `audio.available`; this is
   * the same planned path, mirrored onto the exercise so a drill can be played
   * without loading its item first.
   */
  readonly audioPath: string | null;
  readonly bo: string | null;
  readonly roman: string | null;
  readonly en: string | null;
};

/** What every exercise carries, whatever it asks. */
type ExerciseCore = {
  readonly id: ExerciseId;
  readonly stopId: StopId;
  readonly track: Track;
  /** Position among the stop's exercises. The script's own order is `StopPosition.n`. */
  readonly ordinal: number;
  readonly family: ExerciseFamily;
  /** What the drill is about. Null for the sixteen drills that run over a whole stop. */
  readonly target: ItemRef | null;
  /** The one right answer, where the exercise has exactly one. */
  readonly answerId: ContentItemId | null;
  /**
   * Why this exercise cannot run yet.
   *
   * `'audio'` on 3,236 of the 5,913, and that is the normal state rather than an
   * error. No recordings exist, so a listening drill has nothing to play and the
   * stop substitutes something else. `docs/03` §4.1 calls audio-free substitution
   * every stop's normal state, so the adapter returns the exercise and the use case
   * decides what to do with it.
   */
  readonly blockedOn: 'audio' | null;
  readonly prompt: ExercisePrompt;
  /** How the wrong answers were chosen, for review rather than for display. */
  readonly distractorRule: string | null;
  /** Why this drill exists here, where the content set explains itself. */
  readonly reason: string | null;
  readonly options: readonly ExerciseOption[];
  readonly chunks: readonly ExerciseChunkRef[];
};

/** Hear it, then choose the word. */
export type ListenPickExercise = ExerciseCore & {readonly type: 'listen-pick'};

/** Read the gloss, then choose the word. */
export type MeaningPickExercise = ExerciseCore & {readonly type: 'meaning-pick'};

/** Hear the phrase, then choose it. */
export type PhraseRecogniseExercise = ExerciseCore & {readonly type: 'phrase-recognise'};

/**
 * Put the phrase back in order from its chunks.
 *
 * Carries nothing of its own, and all 351 of these store an empty payload. The
 * correct order is the chunk order of the phrase in `target`, and the tray is those
 * chunks plus the decoys in `chunks` — both already resolvable, so storing either
 * again would be a second copy that can disagree with the first.
 */
export type PhraseArrangeExercise = ExerciseCore & {readonly type: 'phrase-arrange'};

/**
 * Fill the gap in a phrase.
 *
 * `blank` is the index of the target phrase's chunk that is missing, so the right
 * answer comes from the phrase. `chunks` holds the candidates that do not fill it.
 */
export type PhraseClozeExercise = ExerciseCore & {
  readonly type: 'phrase-cloze';
  readonly blank: number;
};

/**
 * Hear it, say it, compare against the native take.
 *
 * Imitative only. Nothing is scored against a grammar, and `note` is the content
 * set saying so on every one of these rows.
 */
export type PhraseProduceExercise = ExerciseCore & {
  readonly type: 'phrase-produce';
  readonly note: string;
};

/** Match words to meanings across a board. `boards` is how many the stop lays out. */
export type PairMatchExercise = ExerciseCore & {
  readonly type: 'pair-match';
  readonly board: number;
  readonly boards: number;
};

/** Hear a syllable, then find it among four glyphs. */
export type HearItFindItExercise = ExerciseCore & {readonly type: 'hear-it-find-it'};

/** See a glyph, say it, then check. */
export type SeeItSayItExercise = ExerciseCore & {
  readonly type: 'see-it-say-it';
  readonly glyph: string;
};

/** Read a whole word off the page. */
export type ReadAWordExercise = ExerciseCore & {
  readonly type: 'read-a-word';
  readonly glyph: string;
};

/**
 * Read it aloud and compare against a reference take.
 *
 * `scored` is false on all of them. Record-compare has no right answer — the shape
 * is before, recorded, compared — and `docs/03` limits a stop to two of them, never
 * first and never consecutive.
 */
export type ReadItAloudExercise = ExerciseCore & {
  readonly type: 'read-it-aloud';
  readonly glyph: string;
  /** The reference recording to play back against. */
  readonly compareWith: string;
  readonly scored: boolean;
};

/** Answer a question about the script by tapping a glyph or a mark. */
export type SpotItExercise = ExerciseCore & {
  readonly type: 'spot-it';
  readonly question: string;
  readonly glyph: string | null;
};

/** Find the root letter in a stack. `answerIndex` is its position within the glyph. */
export type FindTheRootExercise = ExerciseCore & {
  readonly type: 'find-the-root';
  readonly glyph: string;
  readonly answerBo: string;
  readonly answerIndex: number;
  /** What the taps are over — a position in the glyph rather than a listed option. */
  readonly optionKind: string;
};

/** The slots a stack is assembled into, in written order. */
export type StackSlots = {
  readonly prefix: string | null;
  readonly superscript: string | null;
  readonly root: string;
  readonly subscript: readonly string[] | null;
  readonly vowel: string | null;
  readonly suffix: string | null;
  readonly suffix2: string | null;
};

/**
 * Build a stack from chips.
 *
 * Four trays rather than one, because a chip that can only be a superscript should
 * not be offered as a root. `glyph` is absent on the eight rows where the drill is
 * given by sound alone, and `disambiguatedBy` says what settles a reading that the
 * sound leaves open.
 */
export type BuildTheStackExercise = ExerciseCore & {
  readonly type: 'build-the-stack';
  readonly glyph: string | null;
  readonly reading: string;
  readonly answerSlots: StackSlots;
  readonly chips: readonly string[];
  readonly superscriptChips: readonly string[];
  readonly subscriptChips: readonly string[];
  readonly vowelChips: readonly string[];
  readonly syllablesInTray: number;
  readonly disambiguatedBy: string | null;
};

/** Sort syllables by whether a change landed on them. */
export type SortWhatChangedExercise = ExerciseCore & {
  readonly type: 'sort-what-changed';
  readonly question: string;
  readonly pairs: readonly ChangePair[];
};

/**
 * Choose every affix that can attach to a root.
 *
 * The only multi-select drill. `answers` names them as `slot:letter`, e.g.
 * `prefix:མ`, because the same letter attaching in two positions is two answers.
 */
export type WhatAttachesExercise = ExerciseCore & {
  readonly type: 'what-attaches';
  readonly question: string;
  readonly root: string;
  readonly answers: readonly string[];
  readonly multiSelect: boolean;
  readonly optionKind: string;
};

/** Every drill the content set contains, discriminated on `type`. */
export type Exercise =
  | ListenPickExercise
  | MeaningPickExercise
  | PhraseRecogniseExercise
  | PhraseArrangeExercise
  | PhraseClozeExercise
  | PhraseProduceExercise
  | PairMatchExercise
  | HearItFindItExercise
  | SeeItSayItExercise
  | ReadAWordExercise
  | ReadItAloudExercise
  | SpotItExercise
  | FindTheRootExercise
  | BuildTheStackExercise
  | SortWhatChangedExercise
  | WhatAttachesExercise;

/** The `type` of any exercise, as a union. */
export type ExerciseType = Exercise['type'];
