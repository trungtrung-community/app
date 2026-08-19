/**
 * @fileoverview Read-only access to the bundled content set.
 *
 * Content is generated outside this repo — the design system's Python pipeline
 * validates it against 41 rules and compiles it to a SQLite artifact. The app
 * consumes that artifact and contains no conversion logic, so this port describes
 * capabilities rather than tables.
 *
 * Two adapters satisfy it from day one, which is why the port is not speculative:
 * SQLite on native, and a curated JSON fixture on web and in tests. `expo-sqlite`
 * web support is alpha and `docs/06` runs the whole end-to-end suite on the Expo
 * web build, so the second adapter is load-bearing immediately.
 *
 * **Ten capabilities, one wired port.** Content lives in one medium with one
 * lifecycle, so `src/composition/container.ts` constructs one object and the app
 * asks it for everything — a repository per entity would double the wiring for
 * nothing. But a caller should not depend on forty methods to use two. The
 * capabilities below are separate types so that a use case can take
 * `WalkSource` and be testable with a double that has five methods on it, while
 * `ContentSource` remains the single thing an adapter implements and the container
 * hands out.
 *
 * The domain types the capabilities are written in live beside this file, and are
 * re-exported from here so an adapter has one import path for the whole content
 * vocabulary:
 *
 * - `content-ids.ts`      identifiers, kinds, tracks, audio references
 * - `content-model.ts`    words, phrases, chunks, stops, script positions, and the
 *                         Read inventory: letters, stacks, syllables, words, marks
 * - `content-exercise.ts` the sixteen drill types as one discriminated union
 */

import type {
  CollectionId,
  CombinerId,
  ExerciseId,
  LetterId,
  PhraseId,
  ReadRuleId,
  ReadWordId,
  SectionId,
  StackId,
  StopId,
  SyllableId,
  Track,
  VocabId,
} from './content-ids';
import type {Exercise} from './content-exercise';
import type {
  Affix,
  Collection,
  Combiner,
  District,
  Letter,
  Mark,
  PhraseItem,
  ReadCue,
  ReadRule,
  ReadWord,
  Section,
  Stack,
  Stop,
  StopPosition,
  Syllable,
  VocabularyItem,
} from './content-model';

export type * from './content-ids';
// `StackSlots` arrives through both of the next two stars — `content-exercise`
// re-exports `content-model`'s — so the duplicate name is one type, not two.
// eslint-disable-next-line import/export
export type * from './content-model';
// eslint-disable-next-line import/export
export type * from './content-exercise';

/**
 * Words and phrases, looked up and searched.
 *
 * The dictionary screens and the word sheet. Also what a card reaches for when a
 * script position names an item and the screen has to draw it.
 */
export type DictionarySource = {
  getVocabulary(id: VocabId): Promise<VocabularyItem>;
  /**
   * Every vocabulary record a district teaches, in teaching order.
   *
   * Taught, not homed. A word reused from another district appears here and
   * keeps its own `district` — the two are different questions.
   */
  listVocabularyByDistrict(district: string): Promise<readonly VocabularyItem[]>;
  /** Backed by FTS5 on native. Matches Tibetan, romanization and gloss. */
  searchVocabulary(query: string, limit?: number): Promise<readonly VocabularyItem[]>;
  /** With its chunks, in spoken order. */
  getPhrase(id: PhraseId): Promise<PhraseItem>;
  /** Taught, not homed, exactly as the vocabulary list is. */
  listPhrasesByDistrict(district: string): Promise<readonly PhraseItem[]>;
  /** A separate index from the vocabulary one, because a phrase is not a word. */
  searchPhrases(query: string, limit?: number): Promise<readonly PhraseItem[]>;
};

/**
 * The map and the walk: what there is to do, and in what order.
 *
 * A stop's script is the ordered list of positions the learner moves through. It is
 * generated at build time and validated there, so the app reads a walk rather than
 * assembling one.
 */
export type WalkSource = {
  /** The chapters of one track, in order. */
  listSections(track: Track): Promise<readonly Section[]>;
  /** Every district on the Speak map, in map order. */
  listDistricts(): Promise<readonly District[]>;
  getDistrict(slug: string): Promise<District>;
  getStop(id: StopId): Promise<Stop>;
  /** The Speak walk: a district's stops, in walking order. */
  listStopsByDistrict(district: string): Promise<readonly Stop[]>;
  /** The Read walk, which is by section rather than by place. */
  listStopsBySection(sectionId: SectionId): Promise<readonly Stop[]>;
  /**
   * The stop's positions, in order.
   *
   * What the engine appends at run time — a re-queued miss, the second look at the
   * end of a circuit — is not here and cannot be. This is the part that was decided
   * before the learner arrived.
   */
  getStopScript(id: StopId): Promise<readonly StopPosition[]>;
};

/**
 * The drills, with their options and chunks already resolved.
 *
 * Resolved rather than referenced, because every caller needs the text: a chip tray
 * cannot draw a chunk id, and an answer choice cannot draw an item id.
 */
export type ExerciseSource = {
  getExercise(id: ExerciseId): Promise<Exercise>;
  /** In the stop's own exercise order, which is not the script's position order. */
  listExercisesByStop(id: StopId): Promise<readonly Exercise[]>;
};

/** The keepsake shelves, and what is on them. */
export type CollectionSource = {
  listCollections(): Promise<readonly Collection[]>;
  getCollection(id: CollectionId): Promise<Collection>;
};

/**
 * The Read track's first reference surfaces: the letters, and the rules.
 *
 * These four methods once stood alone because the committed fixture held only Read
 * section 1 — a method the fixture could not answer would have made the two
 * adapters disagree, and the contract test exists to prove they do not. The fixture
 * now carries the rest of the Read inventory — whole tables where they are small,
 * the section 6 and 7 syllables where they are not — so the deferral is over and
 * the stacks, syllables, words, affixes, combiners, marks and cues have
 * capabilities of their own below.
 */
export type ScriptReferenceSource = {
  /** All fifty-five: the thirty, the four vowels, the ten digits, the Sanskrit eleven. */
  listLetters(): Promise<readonly Letter[]>;
  getLetter(id: LetterId): Promise<Letter>;
  listReadRules(): Promise<readonly ReadRule[]>;
  getReadRule(id: ReadRuleId): Promise<ReadRule>;
};

/**
 * The stacks, whole.
 *
 * 199 records is a list the stack drills genuinely read end to end — the confusable
 * pools and the assembly trays draw on the whole set — so this one is unscoped
 * where the syllables are not.
 */
export type StackSource = {
  /** All 199, in teaching order: section first, then id. */
  listStacks(): Promise<readonly Stack[]>;
  getStack(id: StackId): Promise<Stack>;
};

/**
 * The syllable piles, always scoped.
 *
 * 3,116 syllables is a pile, not a list a screen draws whole. Every query names a
 * family — one Q6 pile shape — and a section ceiling, so no caller can ask for the
 * unbounded everything. The scoping is also what lets the web fixture answer
 * honestly inside what it carries, the same precedent the district subset set.
 */
export type SyllableSource = {
  /** The family's syllables taught by `maxSection`, in section-then-id order. */
  listSyllables(family: string, maxSection: number): Promise<readonly Syllable[]>;
  /** The size of that same pile, without assembling it. */
  countSyllables(family: string, maxSection: number): Promise<number>;
  getSyllable(id: SyllableId): Promise<Syllable>;
};

/** The Read track's words: real words, read off the page. */
export type ReadWordSource = {
  /** All 452, in teaching order: section first, then id. */
  listReadWords(): Promise<readonly ReadWord[]>;
  getReadWord(id: ReadWordId): Promise<ReadWord>;
};

/**
 * The rest of the Read reference: the attachment system, and the page furniture.
 *
 * Four small closed sets that the reference screens list whole. Only the combiner
 * gets a lookup of its own, because a combiner card is a destination; an affix, a
 * mark or a cue is only ever drawn from its list.
 */
export type ReadReferenceSource = {
  /** The twelve: ten suffixes and the two second suffixes. */
  listAffixes(): Promise<readonly Affix[]>;
  /** The seven: three superscripts, then the four subscripts. */
  listCombiners(): Promise<readonly Combiner[]>;
  getCombiner(id: CombinerId): Promise<Combiner>;
  /** The seven punctuation and head marks. */
  listMarks(): Promise<readonly Mark[]>;
  /** The find-the-root ladder, in rung order. */
  listReadCues(): Promise<readonly ReadCue[]>;
};

/** Which content build is being served, for the version gate. */
export type ContentCatalog = {
  contentVersion(): Promise<string>;
};

/**
 * Everything the bundled content set can answer.
 *
 * What an adapter implements and what the container hands out. Depend on one of the
 * capabilities above instead wherever you can; depend on this where you genuinely
 * need several.
 */
export type ContentSource = DictionarySource &
  WalkSource &
  ExerciseSource &
  CollectionSource &
  ScriptReferenceSource &
  StackSource &
  SyllableSource &
  ReadWordSource &
  ReadReferenceSource &
  ContentCatalog;
