/**
 * @fileoverview What the content set is made of, as the app reads it.
 *
 * Domain values, not rows: camelCase, readonly throughout, and shaped the way a
 * screen and a rule want to read them rather than the way SQLite stores them best.
 * `src/infra/content/mappers.ts` is the only file that knows both shapes.
 *
 * Readonly is not decoration. These values are shared between the walk, the engine
 * and several screens at once, and a list a caller can sort in place is a list the
 * next caller receives in a different order.
 *
 * Two things are deliberately absent from every type here, and both are present in
 * the stored rows:
 *
 * - **Authoring metadata.** `status` and `reviewed_by` record whether a string has
 *   been through a native speaker. That is a question about the content set, asked
 *   in the design system, and no screen renders it.
 * - **Spec cross-references.** Each Read payload names the screens in `docs/02` that
 *   draw it. The renderer is chosen by the exercise family, so carrying the
 *   reference into the app would be a second authority for one decision.
 */

import type {
  AudioRef,
  ChunkId,
  CollectionId,
  ContentItemId,
  DistrictId,
  ExerciseId,
  ItemKind,
  LetterId,
  PhraseId,
  ReadRuleId,
  SectionId,
  StopId,
  Track,
  VocabId,
} from './content-ids';

/**
 * One chapter of a track.
 *
 * Speak has six and Read has eleven. A section is what a district or a Read stop
 * belongs to, and what the map groups by.
 */
export type Section = {
  readonly id: SectionId;
  readonly track: Track;
  readonly number: number;
  readonly name: string;
  readonly nameBo: string | null;
  readonly outcome: string | null;
};

/**
 * One place on the Speak map.
 *
 * `slug` is what every by-district query takes, because it is what a route carries
 * and what a learner sees in a URL. The id is derived from it and is not the thing
 * to build by hand.
 */
export type District = {
  readonly id: DistrictId;
  readonly number: number;
  readonly slug: string;
  readonly name: string;
  readonly sectionId: SectionId;
};

/**
 * One vocabulary record.
 *
 * The naming triple is a design-system rule, not a display preference: Tibetan
 * first, then the romanization, then the English gloss, everywhere. `roman` is the
 * Trungtrung romanization and the one a learner reads. `thl` is the older scheme
 * and appears in exactly one place in the product — the "also written" row on the
 * word sheet — so it stays in the data but never becomes a label or a label's
 * accessible name.
 */
export type VocabularyItem = {
  readonly id: VocabId;
  readonly slug: string;
  /**
   * The **home** district — where this word was coined, and the one the record
   * itself names. It is NOT the only district that teaches the word: 79
   * records are taught elsewhere as well, so a district list comes from
   * `listVocabularyByDistrict`, never from filtering on this field.
   */
  readonly district: string;
  /** The home district's number. Same caveat as `district`. */
  readonly districtNumber: number;
  /**
   * The lexical identity this entry belongs to.
   *
   * A word and a card are not the same thing. གྲང་མོ is one word taught as
   * cold-of-a-drink, cold-of-a-room and cold-of-weather — three entries, one
   * `wordId`. ཐང is two different words that share a spelling, so its two
   * entries have different ones. Search returns rows, not words; grouping them
   * is the screen's decision and this is what it groups by.
   */
  readonly wordId: string;
  readonly bo: string;
  readonly roman: string;
  readonly en: string;
  readonly enDefinition: string | null;
  readonly wylie: string | null;
  readonly thl: string | null;
  /** The one place THL is allowed to surface: the word sheet's "also written" row. */
  readonly thlNote: string | null;
  readonly pos: string | null;
  /** Drawn by WordRow as the register marker. */
  readonly register: string | null;
  readonly culturalNote: string | null;
  /** The illustration key, where the design system draws one. */
  readonly illustration: string | null;
  /** Whether this word is a keepsake a collection can hold. */
  readonly artifact: boolean;
  readonly audio: AudioRef;
};

/**
 * One phrase, drilled whole.
 *
 * A phrase is never assembled from English and never built out of its parts by the
 * learner. `chunks` exists so the phrase card can gloss it word by word after the
 * learner already knows the whole, and so the arrange and cloze exercises have
 * something to lay out.
 *
 * `enLiteral` is the word-for-word reading and `en` is what a person would actually
 * say. Showing the literal alone teaches a sentence nobody speaks.
 */
export type PhraseItem = {
  readonly id: PhraseId;
  readonly slug: string;
  readonly district: string;
  readonly districtNumber: number;
  readonly bo: string;
  readonly roman: string;
  readonly en: string;
  readonly enDefinition: string | null;
  readonly enLiteral: string | null;
  readonly usageNote: string | null;
  readonly culturalNote: string | null;
  readonly wylie: string | null;
  readonly thl: string | null;
  readonly register: string | null;
  readonly illustration: string | null;
  readonly artifact: boolean;
  /** Whether the phrase is a frame other words slot into, rather than a fixed line. */
  readonly template: boolean;
  readonly audio: AudioRef;
  /** In spoken order. Empty for a phrase nobody has chunked yet. */
  readonly chunks: readonly Chunk[];
};

/**
 * One piece of a phrase, in spoken order.
 *
 * `vocabRef` points at the word the chunk is, where the learner has met it as a word
 * in its own right. Most chunks have none — particles, endings and the pieces of a
 * fixed expression are not vocabulary and must never be taught as if they were.
 *
 * `copula` marks the linking verbs. They are recognition-only by rule: the app shows
 * them inside a phrase and never asks a learner to choose between them, because
 * choosing correctly requires an evidentiality judgement nobody has taught yet.
 *
 * `tappable` is the content's own decision about whether the chunk repays a tap.
 */
export type Chunk = {
  readonly id: ChunkId;
  readonly phraseId: PhraseId;
  readonly ordinal: number;
  readonly bo: string;
  readonly wylie: string;
  readonly roman: string | null;
  readonly thl: string | null;
  readonly gloss: string | null;
  readonly vocabRef: VocabId | null;
  readonly copula: boolean;
  readonly tappable: boolean;
};

/**
 * Whether a stop teaches items or states a rule.
 *
 * Four Read stops are `rule-only`: they name a rule and drill it against syllables
 * taught elsewhere, so they have no item list of their own.
 */
export type StopShape = 'items' | 'rule-only';

/** One thing a stop teaches, or brings back from an earlier stop. */
export type StopItem = {
  readonly ordinal: number;
  readonly id: ContentItemId;
  readonly kind: ItemKind;
  readonly role: 'teach' | 'reprise';
};

/**
 * One stop on a walk, in either track.
 *
 * `name` says what the learner will be able to do, not what the stop contains —
 * "Being poured tea", never "tea (generic)". `outcome` says it as a sentence and
 * `capabilities` as the list the closing screen fills in one by one.
 *
 * `district` is null on a Read stop. Read is walked by section, not by place.
 */
export type Stop = {
  readonly id: StopId;
  readonly track: Track;
  readonly district: string | null;
  readonly sectionId: SectionId;
  readonly ordinal: number;
  /** Which loop of the district this stop sits on. Null on a Read stop. */
  readonly circuit: number | null;
  /** The Read map node this stop draws, where it has one. */
  readonly node: string | null;
  readonly shape: StopShape;
  readonly name: string;
  readonly outcome: string;
  readonly capabilities: readonly string[];
  /** How many positions the script holds. The script itself comes from `getStopScript`. */
  readonly positionCount: number;
  /** Whether the content set considers this stop finished. */
  readonly complete: boolean;
  /** What the stop teaches and reprises, in teaching order. */
  readonly items: readonly StopItem[];
};

/**
 * A pair of syllables a drill contrasts, and whether the change landed on it.
 *
 * Shared by `sort-what-changed` and by the recap the Read closing screen draws,
 * because they are the same question asked twice — once as the exercise and once as
 * the summary of how it went.
 */
export type ChangePair = {
  readonly id: ContentItemId;
  readonly bo: string;
  readonly reading: string;
  /** The same syllable without the change, for the comparison. */
  readonly bareId: ContentItemId;
  readonly bareBo: string;
  readonly bareReading: string;
  readonly changed: boolean;
};

type PositionCore = {
  readonly stopId: StopId;
  readonly n: number;
  /** The `docs/02` screen that draws this position, where the content names one. */
  readonly screen: string | null;
};

/** A recognition exercise over an item the learner met in an earlier stop. */
export type WarmUpPosition = PositionCore & {
  readonly kind: 'warm-up';
  readonly exerciseId: ExerciseId;
};

/** S4 and R6: what this stop is for, before any of it happens. */
export type IntroPosition = PositionCore & {
  readonly kind: 'intro';
  /** The opening line. Distinct from `outcome`, which is the capability statement. */
  readonly text: string;
  readonly outcome: string;
  readonly capabilities: readonly string[];
};

/** S10: a word being taught for the first time. */
export type WordCardPosition = PositionCore & {
  readonly kind: 'word-card';
  readonly itemId: VocabId;
};

/** S5: a phrase being taught whole, before anything asks the learner to use it. */
export type PhraseCardPosition = PositionCore & {
  readonly kind: 'phrase-card';
  readonly itemId: PhraseId;
};

/** A letter, a syllable or a decodable word, shown before it is drilled. */
export type LetterCardPosition = PositionCore & {
  readonly kind: 'letter-card';
  readonly itemId: ContentItemId;
};

/** A stack shown as a diagram, before the drills that take it apart. */
export type StackCardPosition = PositionCore & {
  readonly kind: 'stack-card';
  readonly itemId: ContentItemId;
};

/** A reading rule as a keepsake card the learner can come back to. */
export type RuleCardPosition = PositionCore & {
  readonly kind: 'rule-card';
  readonly ruleId: ReadRuleId;
  readonly text: string;
};

/** A reading rule stated in place, on the way into the stop that drills it. */
export type RuleStatementPosition = PositionCore & {
  readonly kind: 'rule-statement';
  readonly ruleId: ReadRuleId;
  readonly text: string;
  /** Whether this rule earns a card of its own once the stop is done. */
  readonly wantsACard: boolean;
};

/** A rule met earlier, restated where it is about to matter again. */
export type RuleReprisePosition = PositionCore & {
  readonly kind: 'rule-reprise';
  readonly ruleId: ReadRuleId;
  readonly text: string;
};

/** A note between drills, covering the items it names. */
export type TipPosition = PositionCore & {
  readonly kind: 'tip';
  readonly text: string;
  readonly covers: readonly ContentItemId[];
  /**
   * Why something is being shown that the learner cannot yet decode.
   *
   * A declared preview is allowed and is counted. An undeclared one is a stop
   * asking for work it has not taught.
   */
  readonly preview: string | null;
};

/** A drill. The exercise itself comes from `getExercise`. */
export type ExercisePosition = PositionCore & {
  readonly kind: 'exercise';
  readonly exerciseId: ExerciseId;
};

/** Building a stack from chips, which is a drill with a tray rather than options. */
export type AssemblyPosition = PositionCore & {
  readonly kind: 'assembly';
  readonly exerciseId: ExerciseId;
};

/** S12: the cultural moment. One per Speak stop, and it asks nothing of the learner. */
export type MomentPosition = PositionCore & {
  readonly kind: 'moment';
};

/** G4: a keepsake earned by finishing the stop that teaches it. */
export type ArtifactCardPosition = PositionCore & {
  readonly kind: 'card';
  readonly itemId: ContentItemId;
};

/** S8 and R11: the closing screen, where the capability circles fill. */
export type EndPosition = PositionCore & {
  readonly kind: 'end';
  readonly capabilities: readonly string[];
  /** What changed, for a Read stop that ends on a contrast. Null elsewhere. */
  readonly recap: readonly ChangePair[] | null;
};

/**
 * One position in a stop's script, discriminated on what it puts on screen.
 *
 * The script is the ordering `docs/03` §4.1 lays down: warm-up, the opening
 * statement, teach-and-check batches, phrase blocks, a mixed tail, the moment, the
 * closing screen. It is generated once at build time so that it can be validated
 * once, rather than re-derived on every device.
 *
 * Two things are deliberately NOT in it, and both are decided while a learner is
 * walking. A missed item comes back three to five positions later. The second look
 * at the end of a circuit is assembled from what actually went wrong. The engine
 * appends both, and neither can be baked into a list built before anyone answered
 * anything.
 *
 * `n` is 1-based and contiguous within a stop.
 */
export type StopPosition =
  | WarmUpPosition
  | IntroPosition
  | WordCardPosition
  | PhraseCardPosition
  | LetterCardPosition
  | StackCardPosition
  | RuleCardPosition
  | RuleStatementPosition
  | RuleReprisePosition
  | TipPosition
  | ExercisePosition
  | AssemblyPosition
  | MomentPosition
  | ArtifactCardPosition
  | EndPosition;

/**
 * One slot on a shelf, filled or not.
 *
 * A card is usually one item. Four are `group` cards, which stand for a set the
 * content names rather than a single record — the twelve zodiac animals are one
 * card, not twelve.
 */
export type CollectionCard = {
  readonly ordinal: number;
  /** Stable across builds, and what a learner's earned-cards list is keyed on. */
  readonly key: string;
  readonly kind: 'vocab' | 'phrase' | 'group';
  readonly itemId: ContentItemId | null;
  readonly groupName: string | null;
  readonly illustration: boolean;
};

/**
 * A shelf of keepsakes, earned rather than bought.
 *
 * `home` is the district a learner would say the collection belongs to, as its
 * display name. It is a label, not a reference: the eight Auspicious Symbols are the
 * Monastery's, and the words themselves are taught across several districts.
 */
export type Collection = {
  readonly id: CollectionId;
  readonly title: string;
  readonly home: string;
  /** What finishing the collection takes. Every collection today wants all of it. */
  readonly completeWhen: 'all';
  readonly cards: readonly CollectionCard[];
};

/**
 * One letter, vowel mark, numeral or Sanskrit letter.
 *
 * All four are letters in the content's own model and the drills mix them, so they
 * are one type with a `subtype` rather than four. The Sanskrit eleven are
 * recognition-only: they appear in mantras and are never asked to be produced.
 *
 * `confusables` is the measured list of letters this one is mistaken for. Telling
 * one from another is the whole subject of the glyph drills, so the list is content
 * rather than a rendering hint.
 */
export type Letter = {
  readonly id: LetterId;
  readonly subtype: 'consonant' | 'vowel' | 'numeral' | 'sanskrit';
  readonly bo: string;
  readonly wylie: string | null;
  readonly name: string | null;
  readonly nameBo: string | null;
  readonly romanization: string | null;
  /** The Read section that teaches it. */
  readonly section: number;
  /** Position in the thirty, where the letter is one of them. */
  readonly row: number | null;
  readonly column: number | null;
  readonly columnName: string | null;
  readonly series: 'high' | 'aspirated_high' | 'low' | null;
  /** The combining mark itself, for a vowel. */
  readonly mark: string | null;
  readonly markCodePoint: string | null;
  /** The letter a vowel mark is shown riding on. */
  readonly carrier: string | null;
  readonly position: 'above' | 'below' | null;
  readonly exampleSyllable: string | null;
  /** The numeric value, for a digit. */
  readonly value: number | null;
  /** The Speak word this letter is also a word for, where there is one. */
  readonly speakRef: VocabId | null;
  readonly recognitionOnly: boolean;
  /** The letter this one is a mirror image of. */
  readonly mirrors: LetterId | null;
  readonly audio: AudioRef | null;
  readonly confusables: readonly LetterId[];
};

/**
 * One reading rule, stated once and referred to everywhere.
 *
 * `requires` names the rules a learner has to hold already. It is what keeps a drill
 * from asking for a judgement that depends on something two sections away.
 */
export type ReadRule = {
  readonly id: ReadRuleId;
  readonly statement: string;
  readonly section: number;
  /** The keepsake card that carries this rule, where one does. */
  readonly card: string | null;
  readonly requires: readonly ReadRuleId[];
};
