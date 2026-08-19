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
  AffixId,
  AudioRef,
  ChunkId,
  CollectionId,
  CombinerId,
  ContentItemId,
  DistrictId,
  ExerciseId,
  ItemKind,
  LetterId,
  MarkId,
  PhraseId,
  ReadCueId,
  ReadRuleId,
  ReadWordId,
  SectionId,
  StackId,
  StopId,
  SyllableId,
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

/**
 * The slots a stack is assembled into, in written order.
 *
 * One shape for three uses: the stack record's own anatomy, the syllable's, and the
 * answer a `build-the-stack` drill is checked against. `root` is the only slot every
 * stack fills.
 */
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
 * One further way an ambiguous stack can be read.
 *
 * འབ is a prefix plus a root reading `ba`, and a root plus a suffix reading `aap`.
 * The record's own `reading` is the reading its group implies; each entry here is an
 * alternative parse, said as `as` — "root + suffix" — with the root that parse picks.
 */
export type StackReading = {
  readonly as: string;
  readonly reading: string;
  readonly root: string;
  /** The root's position within the glyph, 0-based. */
  readonly rootIndex: number;
  readonly wylie: string;
};

/**
 * Whether the corpus actually contains the stack, and how often.
 *
 * Null on a stack the tables declare without corpus evidence. The teaching does not
 * key on this; it is the content set carrying its own receipts.
 */
export type StackAttestation = {
  readonly example: string;
  readonly inDeclaredTables: boolean;
  readonly occurrences: number;
};

/**
 * One stack: letters combined into a single written unit.
 *
 * `group` is which table of the spec the stack belongs to — prefix, superscript,
 * subscript or compound. `slots` is its anatomy, already parsed, which is what the
 * stack card diagrams and what the assembly drill checks against.
 */
export type Stack = {
  readonly id: StackId;
  readonly bo: string;
  readonly wylie: string;
  readonly root: string | null;
  /** The root's position within the glyph, 0-based. */
  readonly rootIndex: number | null;
  /** The attaching letter, on a stack whose group is a single attachment. */
  readonly affix: string | null;
  readonly group: string;
  readonly reading: string | null;
  readonly romanization: string | null;
  /** Whether the glyph alone underdetermines the reading. `readsAlsoAs` holds the rest. */
  readonly ambiguous: boolean;
  readonly readsAlsoAs: readonly StackReading[];
  readonly attested: StackAttestation | null;
  readonly section: number;
  readonly slots: StackSlots;
  readonly audio: AudioRef | null;
  /** The reading rules this stack demonstrates. */
  readonly ruleIds: readonly ReadRuleId[];
};

/**
 * One vowel variant of a syllable, where the content drills the vowel row whole.
 *
 * Only the prefix-demo syllables carry forms. `drilled` marks the one variant the
 * stop actually asks about; the rest are shown as the row it belongs to.
 */
export type SyllableForm = {
  readonly ordinal: number;
  readonly bo: string;
  readonly wylie: string | null;
  readonly reading: string | null;
  /** The combining vowel mark this form adds, or null on the bare form. */
  readonly vowel: string | null;
  readonly drilled: boolean;
  readonly audio: AudioRef;
};

/**
 * One syllable from the drill piles.
 *
 * `family` and `section` are the two axes every syllable query is scoped by: a
 * family is one pile shape — a grid, an ending grid, the corpus — and the section is
 * where the pile becomes available. There is no unscoped list of these on purpose;
 * 3,116 rows is a pile, not a list a screen draws whole.
 */
export type Syllable = {
  readonly id: SyllableId;
  readonly bo: string;
  readonly wylie: string;
  readonly root: string | null;
  /** The root's position within the glyph, 0-based. */
  readonly rootIndex: number | null;
  /** The combining vowel mark, where one is written. */
  readonly vowel: string | null;
  readonly family: string;
  readonly reading: string | null;
  readonly romanization: string | null;
  readonly ambiguous: boolean;
  /** What this syllable exists to show, where the content says. */
  readonly demonstrates: string | null;
  readonly sourceNote: string | null;
  readonly section: number;
  readonly slots: StackSlots;
  readonly audio: AudioRef | null;
  /** The reading rules this syllable demonstrates. */
  readonly ruleIds: readonly ReadRuleId[];
  /** The vowel row, on a syllable drilled as one. Empty on the rest. */
  readonly forms: readonly SyllableForm[];
};

/**
 * One letter in its attaching role: a suffix, or a second suffix.
 *
 * The same letter can be an `Affix` twice — ད is a suffix and an archaic second
 * suffix — so this is a role record that points at its letter, not a letter subtype.
 */
export type Affix = {
  readonly id: AffixId;
  /** The role: `suffix` or `suffix2` in this build. */
  readonly type: string;
  readonly letterId: LetterId | null;
  readonly bo: string;
  readonly wylie: string | null;
  /** The sound the affix leaves at the end of the syllable. Empty when silent. */
  readonly finalSound: string | null;
  readonly silent: boolean;
  /** Whether the affix fronts the root's vowel. Null where the question does not apply. */
  readonly frontsVowel: boolean | null;
  readonly mayFollowAnyRoot: boolean | null;
  readonly archaic: boolean | null;
  /** For a second suffix: the suffix letters it may follow. */
  readonly followsSuffix: readonly string[];
  readonly exampleSyllable: SyllableId | null;
  readonly exampleReading: string | null;
  readonly section: number;
  readonly audio: AudioRef | null;
};

/** One row of a combiner's table: the stack it forms and how that stack reads. */
export type CombinerReading = {
  readonly bo: string;
  /** The root the combiner attaches to. */
  readonly from: string;
  readonly reading: string;
};

/** A reading in the combiner's table that does not follow its rule, and why. */
export type CombinerException = {
  readonly bo: string;
  readonly note: string;
};

/**
 * One combining letter: a superscript or a subscript, taught as a system.
 *
 * A combiner is the row of the stacks it forms — `readings` is that row, and
 * `stackIds` are the stack records behind it. The same letter above and below is two
 * combiners, because the two attachments behave differently: ར silences as ra-go and
 * retracts as ra-tak.
 */
export type Combiner = {
  readonly id: CombinerId;
  readonly name: string;
  readonly nameBo: string | null;
  /** The combining form of the letter itself. */
  readonly bo: string;
  readonly kind: 'superscript' | 'subscript';
  /** What attaching it does to the reading, as the learner is told. */
  readonly effect: string | null;
  /** The stack shown as the specimen of the whole row. */
  readonly specimen: string | null;
  readonly stackCount: number;
  readonly readings: readonly CombinerReading[];
  readonly exceptions: readonly CombinerException[];
  /** The reading rules the combiner's behaviour is stated as. */
  readonly ruleIds: readonly ReadRuleId[];
  readonly section: number;
  readonly audio: AudioRef | null;
  /** The stack records behind `readings`, resolvable through `StackSource`. */
  readonly stackIds: readonly StackId[];
};

/**
 * One punctuation or head mark.
 *
 * Three of the seven are `taught` — the tsheg and the two shad — and drilled like
 * any item. The rest are recognition-only furniture a learner meets on a page.
 */
export type Mark = {
  readonly id: MarkId;
  readonly name: string | null;
  readonly nameBo: string;
  readonly bo: string;
  /** The Unicode code point, as `U+0F0B`. */
  readonly codePoint: string;
  /** What the mark does on the page, as a sentence. */
  readonly role: string;
  readonly taught: boolean;
  readonly section: number;
};

/**
 * One word of the Read track: a real word, read off the page.
 *
 * `readableFromSection` is the build's own decoding measure — the first section by
 * which every rule the word uses has been taught. It is legitimate ONLY for
 * assembling B2 distractor pools, where the question is what the content could ask.
 * Whether this learner can read the word is the domain's `readable()`, asked of
 * progress, and this field must never stand in for it.
 */
export type ReadWord = {
  readonly id: ReadWordId;
  readonly bo: string;
  readonly wylie: string | null;
  readonly reading: string | null;
  readonly romanization: string | null;
  /** The English glosses, in the content's order. Usually one. */
  readonly glosses: readonly string[];
  /** The written syllables, in written order. */
  readonly syllables: readonly string[];
  /** Whether the word reads by rule alone, with nothing to memorise. */
  readonly decodable: boolean;
  readonly readableFromSection: number | null;
  readonly section: number;
  /** The Speak word this is the written form of, where the learner has met one. */
  readonly speakRef: VocabId | null;
  readonly illustration: string | null;
  readonly audio: AudioRef | null;
  /** The reading rules the word exercises. */
  readonly ruleIds: readonly ReadRuleId[];
};

/**
 * One rung of the find-the-root ladder: how to find the root of a syllable shape.
 *
 * Six cues, tried in rung order `n`, and the first that fits decides. The last rung
 * is the one shape the picture alone cannot settle, which is why it is a sentence
 * about words rather than about letters.
 */
export type ReadCue = {
  readonly id: ReadCueId;
  readonly n: number;
  readonly headline: string;
  /** The clause the card sets large, stored in its display casing. */
  readonly emphasis: string;
  readonly sentence: string;
};
