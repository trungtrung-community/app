/**
 * @fileoverview GENERATED FILE — DO NOT EDIT.
 *
 * Regenerate with:  npm run sync:content
 * Verify with:      npm run check:content
 *
 * The shape of the compiled content artifact, generated from its manifest.
 * These are STORAGE types, not domain types: snake_case, nullable wherever the
 * column is, and deliberately not readonly. Map them at the adapter boundary —
 * the engine must never see a database row.
 *
 * schema_version  4
 * content_version ab663531dfe680c8
 */

/**
 * The schema this file was generated against.
 *
 * The adapter asserts the opened database reports the same number. A content
 * build with a changed schema therefore fails loudly at startup rather than
 * returning undefined for a renamed column.
 */
export const CONTENT_SCHEMA_VERSION = 4;

/**
 * The content build this app bundles.
 *
 * expo-sqlite copies a bundled database to the app directory on first launch
 * and does NOT replace it on a later app update. So the adapter compares this
 * against what the copied file reports and re-imports when they differ, which
 * is safe because progress lives in MMKV and never in the content database.
 */
export const CONTENT_VERSION = "ab663531dfe680c8";

/** Every value `collection.complete_when` holds in this build. */
export type CollectionCompleteWhen = "all";

/** Every value `collection_card.kind` holds in this build. */
export type CollectionCardKind = "group" | "phrase" | "vocab";

/** Every value `collection_item.kind` holds in this build. */
export type CollectionItemKind = "phrase" | "vocab";

/** Every value `exercise.blocked_on` holds in this build. */
export type ExerciseBlockedOn = "audio";

/** Every value `exercise.family` holds in this build. */
export type ExerciseFamily = "assembly" | "chip-arrange" | "multi-select" | "pair-match" | "record-compare" | "tap-select (chip)" | "tap-select (gloss)" | "tap-select (glyph)" | "tap-select (position)" | "tap-select (text)";

/** Every value `exercise.target_kind` holds in this build. */
export type ExerciseTargetKind = "letter" | "mark" | "phrase" | "stack" | "syllable" | "vocab" | "word";

/** Every value `exercise.track` holds in this build. */
export type ExerciseTrack = "read" | "speak";

/** Every value `exercise.type` holds in this build. */
export type ExerciseType = "build-the-stack" | "find-the-root" | "hear-it-find-it" | "listen-pick" | "meaning-pick" | "pair-match" | "phrase-arrange" | "phrase-cloze" | "phrase-produce" | "phrase-recognise" | "read-a-word" | "read-it-aloud" | "see-it-say-it" | "sort-what-changed" | "spot-it" | "what-attaches";

/** Every value `exercise_chunk_ref.role` holds in this build. */
export type ExerciseChunkRefRole = "candidate" | "decoy";

/** Every value `letter.position` holds in this build. */
export type LetterPosition = "above" | "below";

/** Every value `letter.series` holds in this build. */
export type LetterSeries = "aspirated_high" | "high" | "low";

/** Every value `letter.subtype` holds in this build. */
export type LetterSubtype = "consonant" | "numeral" | "sanskrit" | "vowel";

/** Every value `placement.kind` holds in this build. */
export type PlacementKind = "phrase" | "vocab";

/** Every value `placement.role` holds in this build. */
export type PlacementRole = "home" | "reuse";

/** Every value `section.track` holds in this build. */
export type SectionTrack = "read" | "speak";

/** Every value `stop.shape` holds in this build. */
export type StopShape = "items" | "rule-only";

/** Every value `stop.track` holds in this build. */
export type StopTrack = "read" | "speak";

/** Every value `stop_item.kind` holds in this build. */
export type StopItemKind = "letter" | "mark" | "phrase" | "stack" | "syllable" | "vocab" | "word";

/** Every value `stop_item.role` holds in this build. */
export type StopItemRole = "reprise" | "teach";

/** Every value `stop_position.kind` holds in this build. */
export type StopPositionKind = "assembly" | "card" | "end" | "exercise" | "intro" | "letter-card" | "moment" | "phrase-card" | "rule-card" | "rule-reprise" | "rule-statement" | "stack-card" | "tip" | "warm-up" | "word-card";

/** affix — 12 rows in this build. */
export type AffixRow = {
  id: string;
  type: string;
  letter_id: string | null;
  bo: string;
  wylie: string | null;
  final_sound: string | null;
  silent: number;
  fronts_vowel: number | null;
  may_follow_any_root: number | null;
  archaic: number | null;
  follows_suffix_json: string | null;
  example_syllable: string | null;
  example_reading: string | null;
  section: number;
  audio_path: string | null;
  audio_available: number;
  status: string | null;
};

/** chunk — 3317 rows in this build. */
export type ChunkRow = {
  id: string;
  phrase_id: string;
  ordinal: number;
  bo: string;
  wylie: string;
  roman: string | null;
  thl: string | null;
  gloss: string | null;
  vocab_ref: string | null;
  copula: number;
  tappable: number;
};

/** collection — 10 rows in this build. */
export type CollectionRow = {
  id: string;
  title: string;
  home: string;
  complete_when: CollectionCompleteWhen;
};

/** collection_card — 110 rows in this build. */
export type CollectionCardRow = {
  collection_id: string;
  ordinal: number;
  card_key: string;
  kind: CollectionCardKind;
  item_id: string | null;
  group_name: string | null;
  illustration: number;
};

/** collection_item — 133 rows in this build. */
export type CollectionItemRow = {
  collection_id: string;
  item_id: string;
  kind: CollectionItemKind;
};

/** combiner — 7 rows in this build. */
export type CombinerRow = {
  id: string;
  name: string;
  name_bo: string | null;
  bo: string;
  type: string;
  position: string;
  effect: string | null;
  specimen: string | null;
  stack_count: number;
  readings_json: string;
  exceptions_json: string;
  rules_json: string;
  section: number;
  audio_path: string | null;
  audio_available: number;
  status: string | null;
};

/** combiner_stack — 74 rows in this build. */
export type CombinerStackRow = {
  combiner_id: string;
  stack_id: string;
};

/** district — 28 rows in this build. */
export type DistrictRow = {
  id: string;
  number: number;
  slug: string;
  name: string;
  section_id: string;
};

/** exercise — 5913 rows in this build. */
export type ExerciseRow = {
  id: string;
  stop_id: string;
  track: ExerciseTrack;
  ordinal: number;
  type: ExerciseType;
  family: ExerciseFamily;
  target_id: string | null;
  target_kind: ExerciseTargetKind | null;
  answer_id: string | null;
  blocked_on: ExerciseBlockedOn | null;
  prompt_audio_path: string | null;
  prompt_bo: string | null;
  prompt_roman: string | null;
  prompt_en: string | null;
  distractor_rule: string | null;
  reason: string | null;
  payload_json: string;
};

/** exercise_chunk_ref — 1812 rows in this build. */
export type ExerciseChunkRefRow = {
  exercise_id: string;
  ordinal: number;
  chunk_id: string;
  role: ExerciseChunkRefRole;
};

/** exercise_option — 19989 rows in this build. */
export type ExerciseOptionRow = {
  exercise_id: string;
  ordinal: number;
  item_id: string;
  label: string | null;
  is_answer: number;
};

/** letter — 55 rows in this build. */
export type LetterRow = {
  id: string;
  subtype: LetterSubtype;
  bo: string;
  wylie: string | null;
  letter_name: string | null;
  letter_name_bo: string | null;
  romanization: string | null;
  section: number;
  row: number | null;
  col: number | null;
  column_name: string | null;
  series: LetterSeries | null;
  mark: string | null;
  mark_cp: string | null;
  carrier: string | null;
  position: LetterPosition | null;
  example_syllable: string | null;
  value: number | null;
  speak_ref: string | null;
  recognition_only: number;
  mirrors: string | null;
  audio_path: string | null;
  audio_available: number;
  status: string | null;
};

/** letter_confusable — 90 rows in this build. */
export type LetterConfusableRow = {
  letter_id: string;
  ordinal: number;
  confusable_id: string;
};

/** mark — 7 rows in this build. */
export type MarkRow = {
  id: string;
  name: string | null;
  name_bo: string;
  bo: string;
  cp: string;
  role: string;
  taught: number;
  section: number;
  status: string | null;
};

/** meta — 0 rows in this build. */
export type MetaRow = {
  key: string;
  value: string;
};

/** phrase — 647 rows in this build. */
export type PhraseRow = {
  id: string;
  slug: string;
  district: string;
  district_number: number;
  bo: string;
  roman: string;
  en: string;
  en_definition: string | null;
  en_literal: string | null;
  usage_note: string | null;
  cultural_note: string | null;
  wylie: string | null;
  thl: string | null;
  register: string | null;
  illustration: string | null;
  artifact: number;
  template: number;
  status: string | null;
  audio_path: string;
  audio_available: number;
};

/** placement — 2384 rows in this build. */
export type PlacementRow = {
  item_id: string;
  kind: PlacementKind;
  district_id: string;
  role: PlacementRole;
};

/** read_cue — 6 rows in this build. */
export type ReadCueRow = {
  id: string;
  n: number;
  headline: string;
  emphasis: string;
  sentence: string;
};

/** read_rule — 19 rows in this build. */
export type ReadRuleRow = {
  id: string;
  statement: string;
  section: number;
  card: string | null;
};

/** read_rule_requires — 28 rows in this build. */
export type ReadRuleRequiresRow = {
  rule_id: string;
  requires_id: string;
};

/** read_word — 452 rows in this build. */
export type ReadWordRow = {
  id: string;
  bo: string;
  wylie: string | null;
  reading: string | null;
  romanization: string | null;
  gloss_json: string;
  syllables_json: string;
  decodable: number;
  readable_from_section: number | null;
  section: number;
  speak_ref: string | null;
  illustration: string | null;
  audio_path: string | null;
  audio_available: number;
  status: string | null;
};

/** read_word_rule — 2047 rows in this build. */
export type ReadWordRuleRow = {
  word_id: string;
  rule_id: string;
};

/** section — 17 rows in this build. */
export type SectionRow = {
  id: string;
  track: SectionTrack;
  number: number;
  name: string;
  name_bo: string | null;
  outcome: string | null;
};

/** stack — 199 rows in this build. */
export type StackRow = {
  id: string;
  bo: string;
  wylie: string;
  root: string | null;
  root_index: number | null;
  affix: string | null;
  grp: string;
  reading: string | null;
  romanization: string | null;
  ambiguous: number;
  reads_also_as_json: string;
  attested_json: string;
  section: number;
  slots_json: string;
  audio_path: string | null;
  audio_available: number;
  status: string | null;
};

/** stack_rule — 618 rows in this build. */
export type StackRuleRow = {
  stack_id: string;
  rule_id: string;
};

/** stop — 329 rows in this build. */
export type StopRow = {
  id: string;
  track: StopTrack;
  district_id: string | null;
  section_id: string;
  ordinal: number;
  circuit: number | null;
  node: string | null;
  shape: StopShape;
  name: string;
  outcome: string;
  capabilities_json: string;
  position_count: number;
  complete: number;
};

/** stop_item — 2529 rows in this build. */
export type StopItemRow = {
  stop_id: string;
  ordinal: number;
  item_id: string;
  kind: StopItemKind;
  role: StopItemRole;
};

/** stop_position — 9641 rows in this build. */
export type StopPositionRow = {
  stop_id: string;
  n: number;
  kind: StopPositionKind;
  screen: string | null;
  item_id: string | null;
  exercise_id: string | null;
  rule_id: string | null;
  text: string | null;
  payload_json: string | null;
};

/** syllable — 3116 rows in this build. */
export type SyllableRow = {
  id: string;
  bo: string;
  wylie: string;
  root: string | null;
  root_index: number | null;
  vowel: string | null;
  family: string;
  reading: string | null;
  romanization: string | null;
  ambiguous: number;
  demonstrates: string | null;
  source_note: string | null;
  section: number;
  slots_json: string;
  audio_path: string | null;
  audio_available: number;
  status: string | null;
};

/** syllable_form — 192 rows in this build. */
export type SyllableFormRow = {
  syllable_id: string;
  ordinal: number;
  bo: string;
  wylie: string | null;
  reading: string | null;
  vowel: string | null;
  drilled: number;
  audio_path: string;
  audio_available: number;
};

/** syllable_rule — 11850 rows in this build. */
export type SyllableRuleRow = {
  syllable_id: string;
  rule_id: string;
};

/** vocabulary — 1649 rows in this build. */
export type VocabularyRow = {
  id: string;
  slug: string;
  district: string;
  district_number: number;
  bo: string;
  roman: string;
  en: string;
  en_definition: string | null;
  wylie: string | null;
  thl: string | null;
  thl_note: string | null;
  pos: string | null;
  register: string | null;
  cultural_note: string | null;
  illustration: string | null;
  artifact: number;
  status: string | null;
  audio_path: string;
  audio_available: number;
  word_id: string;
};

/**
 * The parsed `exercise.payload_json`, discriminated on the exercise type.
 *
 * The column holds only the remainder — whatever a type needs that the shared
 * columns and the option and chunk tables do not already carry. Eight of the
 * sixteen types need nothing at all, which is the normalisation working rather
 * than a gap.
 *
 * The discriminant is not in the stored JSON. It is `exercise.type`, and the
 * mapper puts the two together, so the switch that reads a payload is exhaustive
 * over the types the artifact actually contains.
 *
 * Keys beginning with an underscore are authoring notes carried in the stored
 * bytes. They are typed here because they are there, and dropped at the mapper
 * because the domain has no use for them.
 */
export type ExercisePayload =
  /** 41 rows in this build. */
  | {
      type: "build-the-stack";
      _why?: string;
      answer_slots: {
        prefix: string | null;
        root: string;
        subscript: readonly string[] | null;
        suffix: string | null;
        suffix2: string | null;
        superscript: string | null;
        vowel: string | null;
      };
      chips: readonly string[];
      disambiguated_by?: string;
      prompt: {
        glyph?: string;
        reading: string;
      };
      screens: readonly string[];
      subscript_chips: readonly string[];
      superscript_chips: readonly string[];
      syllables_in_tray: number;
      vowel_chips: readonly string[];
    }
  /** 36 rows in this build. */
  | {
      type: "find-the-root";
      answer_bo: string;
      answer_index: number;
      cue: string;
      option_kind: string;
      prompt: {
        glyph: string;
      };
      screens: readonly string[];
    }
  /** 168 rows in this build. */
  | {
      type: "hear-it-find-it";
      prompt: Record<string, never>;
      screens: readonly string[];
    }
  /** 1649 rows in this build. */
  | {type: "listen-pick"}
  /** 1649 rows in this build. */
  | {type: "meaning-pick"}
  /** 469 rows in this build. */
  | {
      type: "pair-match";
      board: number;
      boards: number;
    }
  /** 351 rows in this build. */
  | {type: "phrase-arrange"}
  /** 370 rows in this build. */
  | {
      type: "phrase-cloze";
      blank: number;
    }
  /** 219 rows in this build. */
  | {
      type: "phrase-produce";
      note: string;
    }
  /** 647 rows in this build. */
  | {type: "phrase-recognise"}
  /** 12 rows in this build. */
  | {
      type: "read-a-word";
      prompt: {
        glyph: string;
      };
      screens: readonly string[];
    }
  /** 76 rows in this build. */
  | {
      type: "read-it-aloud";
      _note: string;
      prompt: {
        compare_with: string;
        glyph: string;
      };
      scored: boolean;
      screens: readonly string[];
    }
  /** 177 rows in this build. */
  | {
      type: "see-it-say-it";
      prompt: {
        glyph: string;
      };
      screens: readonly string[];
    }
  /** 16 rows in this build. */
  | {
      type: "sort-what-changed";
      prompt: {
        pairs: readonly {
          bare: string;
          bare_bo: string;
          bare_reading: string;
          bo: string;
          changed: boolean;
          item: string;
          reading: string;
        }[];
        question: string;
      };
      screens: readonly string[];
    }
  /** 28 rows in this build. */
  | {
      type: "spot-it";
      prompt: {
        glyph?: string;
        question: string;
      };
      screens: readonly string[];
    }
  /** 5 rows in this build. */
  | {
      type: "what-attaches";
      _all_options: number;
      _source: string;
      answers: readonly string[];
      multi_select: boolean;
      option_kind: string;
      prompt: {
        question: string;
        root: string;
      };
      screens: readonly string[];
    };

/**
 * The parsed `stop_position.payload_json`, discriminated on the position kind.
 *
 * A stop script is one ordered list of positions across both tracks, so the kinds
 * are the union of what a Speak stop and a Read stop each need. Most carry
 * nothing: a position that names an exercise or a card needs only the reference
 * that is already in its own columns.
 */
export type StopPositionPayload =
  /** 5 rows in this build. */
  | {kind: "assembly"}
  /** 133 rows in this build. */
  | {kind: "card"}
  /** 329 rows in this build. */
  | {
      kind: "end";
      capabilities: readonly string[];
      recap?: readonly {
        bare: string;
        bare_bo: string;
        bare_reading: string;
        bo: string;
        changed: boolean;
        item: string;
        reading: string;
      }[];
    }
  /** 5896 rows in this build. */
  | {kind: "exercise"}
  /** 329 rows in this build. */
  | {
      kind: "intro";
      capabilities: readonly string[];
      outcome: string;
    }
  /** 157 rows in this build. */
  | {kind: "letter-card"}
  /** 285 rows in this build. */
  | {kind: "moment"}
  /** 647 rows in this build. */
  | {kind: "phrase-card"}
  /** 8 rows in this build. */
  | {kind: "rule-card"}
  /** 6 rows in this build. */
  | {kind: "rule-reprise"}
  /** 10 rows in this build. */
  | {
      kind: "rule-statement";
      wants_a_card: boolean;
    }
  /** 55 rows in this build. */
  | {kind: "stack-card"}
  /** 120 rows in this build. */
  | {
      kind: "tip";
      covers: readonly string[];
      preview?: string;
    }
  /** 12 rows in this build. */
  | {kind: "warm-up"}
  /** 1649 rows in this build. */
  | {kind: "word-card"};

/**
 * The committed subset the web and test adapter reads.
 *
 * Generated from the fixture itself, so the tables it carries are the tables the
 * JSON adapter can be written against. A table the fixture stops carrying is a
 * compile error in that adapter rather than a query that quietly returns nothing.
 *
 * Every row here is a row read back out of the database that shipped with it, so
 * both adapters map the same shapes with the same code.
 */
export type ContentFixture = {
  content_version: string;
  schema_version: number;
  section: SectionRow[];
  district: DistrictRow[];
  vocabulary: VocabularyRow[];
  phrase: PhraseRow[];
  chunk: ChunkRow[];
  placement: PlacementRow[];
  collection: CollectionRow[];
  collection_item: CollectionItemRow[];
  collection_card: CollectionCardRow[];
  stop: StopRow[];
  stop_item: StopItemRow[];
  stop_position: StopPositionRow[];
  exercise: ExerciseRow[];
  exercise_option: ExerciseOptionRow[];
  exercise_chunk_ref: ExerciseChunkRefRow[];
  letter: LetterRow[];
  letter_confusable: LetterConfusableRow[];
  read_rule: ReadRuleRow[];
  read_rule_requires: ReadRuleRequiresRow[];
  read_cue: ReadCueRow[];
  stack: StackRow[];
  stack_rule: StackRuleRow[];
  syllable: SyllableRow[];
  syllable_rule: SyllableRuleRow[];
  syllable_form: SyllableFormRow[];
  affix: AffixRow[];
  combiner: CombinerRow[];
  combiner_stack: CombinerStackRow[];
  mark: MarkRow[];
  read_word: ReadWordRow[];
  read_word_rule: ReadWordRuleRow[];
};
