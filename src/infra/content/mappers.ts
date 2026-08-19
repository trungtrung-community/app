/**
 * @fileoverview The boundary between storage rows and domain values.
 *
 * A database row is snake_case, nullable wherever the column is, and keeps a list of
 * strings in a JSON column because that is how it stores best. A domain value is
 * camelCase, readonly, and shaped the way the rules and the components want to read
 * it. This file is the only place that knows both.
 *
 * Keeping the two apart is what makes the storage swappable. The engine never sees a
 * row, so a remote adapter that returns a different wire shape only has to produce
 * the same domain value, and nothing above the mapper changes.
 *
 * **Closed columns are assigned, never cast.** `row.kind`, `row.family` and
 * `row.track` come out of `rows.generated.ts` as string-literal unions measured from
 * the artifact itself. Assigning one to its domain counterpart is a compile-time
 * subset check, so a kind added upstream fails here rather than reaching a screen as
 * a string nothing draws. A cast would silence exactly the signal worth having.
 *
 * There is deliberately no schema parsing. The artifact is compiled and verified
 * upstream — `build_db.py` writes a manifest, `sync-content.ts` checks the database
 * against its digest, and `rows.generated.ts` is generated from that same manifest —
 * so per-row validation of trusted local data would cost 67,000 parses for a
 * guarantee the build already gives. The place for runtime validation is the adapter
 * that reads bytes off a network, and it does not exist yet.
 *
 * The two exceptions to that are narrow and both turn a build regression into a
 * named error. A payload is parsed, because JSON in a column has to be. A column
 * that is nullable in storage but required by one script position is checked, so a
 * missing reference reads as a thrown error naming the position rather than as an
 * `undefined` a screen renders blank.
 */

import type {
  AudioRef,
  Chunk,
  Collection,
  CollectionCard,
  ChangePair,
  District,
  Exercise,
  ExerciseChunkRef,
  ExerciseOption,
  Letter,
  LetterId,
  PhraseId,
  PhraseItem,
  ReadRule,
  ReadRuleId,
  Section,
  Stop,
  StopItem,
  StopPosition,
  VocabId,
  VocabularyItem,
} from '../../ports/content-source';
import type {
  ChunkRow,
  CollectionCardRow,
  CollectionRow,
  DistrictRow,
  ExerciseChunkRefRow,
  ExerciseOptionRow,
  ExercisePayload,
  ExerciseRow,
  LetterConfusableRow,
  LetterRow,
  PhraseRow,
  ReadRuleRequiresRow,
  ReadRuleRow,
  SectionRow,
  StopItemRow,
  StopPositionPayload,
  StopPositionRow,
  StopRow,
  VocabularyRow,
} from './rows.generated';

/** SQLite has no boolean. Every flag column is 0 or 1. */
function flag(value: number | null): boolean {
  return value === 1;
}

/** A JSON column, parsed. The build guarantees it holds what its type says. */
function parseJson<T>(text: string): T {
  return JSON.parse(text) as T;
}

/**
 * A column that is nullable in storage and required by this domain value.
 *
 * `stop_position.item_id` is null on a position that names an exercise and set on
 * one that names a card, so the column cannot be NOT NULL. Validation rule 37 holds
 * every position's reference; this turns a regression in that rule into an error
 * that names the position instead of a card that renders blank.
 */
function required<T>(value: T | null, field: string, where: string): T {
  if (value === null) {
    throw new Error(`content: ${where} has no ${field}`);
  }
  return value;
}

/**
 * A recording, as its planned path and whether the take exists.
 *
 * The path is minted by the content build from the item's identity and is known long
 * before anyone records anything, so it is never null on an item that can be
 * recorded at all.
 */
function toAudioRef(path: string, available: number): AudioRef {
  return {path, available: flag(available)};
}

export function toSection(row: SectionRow): Section {
  return {
    id: row.id as Section['id'],
    track: row.track,
    number: row.number,
    name: row.name,
    nameBo: row.name_bo,
    outcome: row.outcome,
  };
}

export function toDistrict(row: DistrictRow): District {
  return {
    id: row.id as District['id'],
    number: row.number,
    slug: row.slug,
    name: row.name,
    sectionId: row.section_id as Section['id'],
  };
}

/** One stored row as the value the rest of the app works with. */
export function toVocabularyItem(row: VocabularyRow): VocabularyItem {
  return {
    id: row.id as VocabId,
    slug: row.slug,
    district: row.district,
    districtNumber: row.district_number,
    wordId: row.word_id,
    bo: row.bo,
    roman: row.roman,
    en: row.en,
    enDefinition: row.en_definition,
    wylie: row.wylie,
    thl: row.thl,
    thlNote: row.thl_note,
    pos: row.pos,
    register: row.register,
    culturalNote: row.cultural_note,
    illustration: row.illustration,
    artifact: flag(row.artifact),
    audio: toAudioRef(row.audio_path, row.audio_available),
  };
}

/** A phrase and its chunks, which travel together because a phrase card needs both. */
export function toPhraseItem(row: PhraseRow, chunks: readonly ChunkRow[]): PhraseItem {
  return {
    id: row.id as PhraseId,
    slug: row.slug,
    district: row.district,
    districtNumber: row.district_number,
    bo: row.bo,
    roman: row.roman,
    en: row.en,
    enDefinition: row.en_definition,
    enLiteral: row.en_literal,
    usageNote: row.usage_note,
    culturalNote: row.cultural_note,
    wylie: row.wylie,
    thl: row.thl,
    register: row.register,
    illustration: row.illustration,
    artifact: flag(row.artifact),
    template: flag(row.template),
    audio: toAudioRef(row.audio_path, row.audio_available),
    chunks: chunks.map(toChunk),
  };
}

export function toChunk(row: ChunkRow): Chunk {
  return {
    id: row.id as Chunk['id'],
    phraseId: row.phrase_id as PhraseId,
    ordinal: row.ordinal,
    bo: row.bo,
    wylie: row.wylie,
    roman: row.roman,
    thl: row.thl,
    gloss: row.gloss,
    vocabRef: row.vocab_ref as VocabId | null,
    copula: flag(row.copula),
    tappable: flag(row.tappable),
  };
}

export function toStopItem(row: StopItemRow): StopItem {
  return {
    ordinal: row.ordinal,
    id: row.item_id as StopItem['id'],
    kind: row.kind,
    role: row.role,
  };
}

/**
 * A stop and what it teaches.
 *
 * `district` is the slug rather than the id, because that is what every by-district
 * query takes and what a route carries. The adapter resolves it; a Read stop has
 * none.
 */
export function toStop(
  row: StopRow,
  districtSlug: string | null,
  items: readonly StopItemRow[],
): Stop {
  return {
    id: row.id as Stop['id'],
    track: row.track,
    district: districtSlug,
    sectionId: row.section_id as Section['id'],
    ordinal: row.ordinal,
    circuit: row.circuit,
    node: row.node,
    shape: row.shape,
    name: row.name,
    outcome: row.outcome,
    capabilities: parseJson<string[]>(row.capabilities_json),
    positionCount: row.position_count,
    complete: flag(row.complete),
    items: items.map(toStopItem),
  };
}

/** The recap shape, which the exercise and the closing screen both use. */
function toChangePair(pair: {
  item: string;
  bo: string;
  reading: string;
  bare: string;
  bare_bo: string;
  bare_reading: string;
  changed: boolean;
}): ChangePair {
  return {
    id: pair.item as ChangePair['id'],
    bo: pair.bo,
    reading: pair.reading,
    bareId: pair.bare as ChangePair['bareId'],
    bareBo: pair.bare_bo,
    bareReading: pair.bare_reading,
    changed: pair.changed,
  };
}

/**
 * One script position, as the variant its kind names.
 *
 * The discriminant is the `kind` column and the rest of the shape is the payload, so
 * the two are put together before the switch. That switch is exhaustive over the
 * fifteen kinds the artifact holds: a sixteenth widens the generated union and stops
 * this file compiling, which is the reason the union is generated at all.
 */
export function toStopPosition(row: StopPositionRow): StopPosition {
  const where = `${row.stop_id} position ${row.n}`;
  const core = {stopId: row.stop_id as Stop['id'], n: row.n, screen: row.screen};
  const payload = {
    ...parseJson<Record<string, unknown>>(row.payload_json ?? '{}'),
    kind: row.kind,
  } as StopPositionPayload;

  const exerciseId = () => required(row.exercise_id, 'exercise_id', where) as Exercise['id'];
  const itemId = () => required(row.item_id, 'item_id', where) as StopItem['id'];
  const ruleId = () => required(row.rule_id, 'rule_id', where) as ReadRuleId;
  const text = () => required(row.text, 'text', where);

  switch (payload.kind) {
    case 'warm-up':
      return {...core, kind: payload.kind, exerciseId: exerciseId()};
    case 'intro':
      return {
        ...core,
        kind: payload.kind,
        text: text(),
        outcome: payload.outcome,
        capabilities: payload.capabilities,
      };
    case 'word-card':
      return {...core, kind: payload.kind, itemId: itemId() as VocabId};
    case 'phrase-card':
      return {...core, kind: payload.kind, itemId: itemId() as PhraseId};
    case 'letter-card':
    case 'stack-card':
      return {...core, kind: payload.kind, itemId: itemId()};
    case 'rule-card':
    case 'rule-reprise':
      return {...core, kind: payload.kind, ruleId: ruleId(), text: text()};
    case 'rule-statement':
      return {
        ...core,
        kind: payload.kind,
        ruleId: ruleId(),
        text: text(),
        wantsACard: payload.wants_a_card,
      };
    case 'tip':
      return {
        ...core,
        kind: payload.kind,
        text: text(),
        covers: payload.covers as readonly StopItem['id'][],
        preview: payload.preview ?? null,
      };
    case 'exercise':
    case 'assembly':
      return {...core, kind: payload.kind, exerciseId: exerciseId()};
    case 'moment':
      return {...core, kind: payload.kind};
    case 'card':
      return {...core, kind: payload.kind, itemId: itemId()};
    case 'end':
      return {
        ...core,
        kind: payload.kind,
        capabilities: payload.capabilities,
        recap: payload.recap ? payload.recap.map(toChangePair) : null,
      };
    default:
      return unhandled(payload, 'stop position');
  }
}

export function toExerciseOption(row: ExerciseOptionRow): ExerciseOption {
  return {
    ordinal: row.ordinal,
    itemId: row.item_id as StopItem['id'],
    label: row.label,
    isAnswer: flag(row.is_answer),
  };
}

/** A tray entry: where it sits, whether it belongs, and the chunk itself. */
export function toExerciseChunkRef(row: ExerciseChunkRefRow, chunk: ChunkRow): ExerciseChunkRef {
  return {ordinal: row.ordinal, role: row.role, chunk: toChunk(chunk)};
}

/**
 * One exercise, as the variant its type names.
 *
 * The switch below is the load-bearing part of the whole content contract. It is
 * exhaustive over the sixteen types the artifact holds, so a seventeenth stops the
 * app compiling instead of arriving on a device as a drill nothing knows how to
 * draw.
 *
 * Options and chunks come in already fetched rather than being looked up here,
 * because a mapper that queries is an adapter and there would then be two of them.
 */
export function toExercise(
  row: ExerciseRow,
  options: readonly ExerciseOptionRow[],
  chunks: readonly ExerciseChunkRef[],
): Exercise {
  const core = {
    id: row.id as Exercise['id'],
    stopId: row.stop_id as Stop['id'],
    track: row.track,
    ordinal: row.ordinal,
    family: row.family,
    target:
      row.target_id === null || row.target_kind === null
        ? null
        : {id: row.target_id as StopItem['id'], kind: row.target_kind},
    answerId: row.answer_id as StopItem['id'] | null,
    blockedOn: row.blocked_on,
    prompt: {
      audioPath: row.prompt_audio_path,
      bo: row.prompt_bo,
      roman: row.prompt_roman,
      en: row.prompt_en,
    },
    distractorRule: row.distractor_rule,
    reason: row.reason,
    options: options.map(toExerciseOption),
    chunks,
  };
  const payload = {
    ...parseJson<Record<string, unknown>>(row.payload_json),
    type: row.type,
  } as ExercisePayload;

  switch (payload.type) {
    case 'listen-pick':
    case 'meaning-pick':
    case 'phrase-recognise':
    case 'phrase-arrange':
      return {...core, type: payload.type};
    case 'phrase-cloze':
      return {...core, type: payload.type, blank: payload.blank};
    case 'phrase-produce':
      return {...core, type: payload.type, note: payload.note};
    case 'pair-match':
      return {...core, type: payload.type, board: payload.board, boards: payload.boards};
    case 'hear-it-find-it':
      return {...core, type: payload.type};
    case 'see-it-say-it':
    case 'read-a-word':
      return {...core, type: payload.type, glyph: payload.prompt.glyph};
    case 'read-it-aloud':
      return {
        ...core,
        type: payload.type,
        glyph: payload.prompt.glyph,
        compareWith: payload.prompt.compare_with,
        scored: payload.scored,
      };
    case 'spot-it':
      return {
        ...core,
        type: payload.type,
        question: payload.prompt.question,
        glyph: payload.prompt.glyph ?? null,
      };
    case 'find-the-root':
      return {
        ...core,
        type: payload.type,
        glyph: payload.prompt.glyph,
        answerBo: payload.answer_bo,
        answerIndex: payload.answer_index,
        optionKind: payload.option_kind,
      };
    case 'build-the-stack':
      return {
        ...core,
        type: payload.type,
        glyph: payload.prompt.glyph ?? null,
        reading: payload.prompt.reading,
        answerSlots: {
          prefix: payload.answer_slots.prefix,
          superscript: payload.answer_slots.superscript,
          root: payload.answer_slots.root,
          subscript: payload.answer_slots.subscript,
          vowel: payload.answer_slots.vowel,
          suffix: payload.answer_slots.suffix,
          suffix2: payload.answer_slots.suffix2,
        },
        chips: payload.chips,
        superscriptChips: payload.superscript_chips,
        subscriptChips: payload.subscript_chips,
        vowelChips: payload.vowel_chips,
        syllablesInTray: payload.syllables_in_tray,
        disambiguatedBy: payload.disambiguated_by ?? null,
      };
    case 'sort-what-changed':
      return {
        ...core,
        type: payload.type,
        question: payload.prompt.question,
        pairs: payload.prompt.pairs.map(toChangePair),
      };
    case 'what-attaches':
      return {
        ...core,
        type: payload.type,
        question: payload.prompt.question,
        root: payload.prompt.root,
        answers: payload.answers,
        multiSelect: payload.multi_select,
        optionKind: payload.option_kind,
      };
    default:
      return unhandled(payload, 'exercise');
  }
}

export function toCollectionCard(row: CollectionCardRow): CollectionCard {
  return {
    ordinal: row.ordinal,
    key: row.card_key,
    kind: row.kind,
    itemId: row.item_id as StopItem['id'] | null,
    groupName: row.group_name,
    illustration: flag(row.illustration),
  };
}

export function toCollection(row: CollectionRow, cards: readonly CollectionCardRow[]): Collection {
  return {
    id: row.id as Collection['id'],
    title: row.title,
    home: row.home,
    completeWhen: row.complete_when,
    cards: cards.map(toCollectionCard),
  };
}

export function toLetter(row: LetterRow, confusables: readonly LetterConfusableRow[]): Letter {
  return {
    id: row.id as LetterId,
    subtype: row.subtype,
    bo: row.bo,
    wylie: row.wylie,
    name: row.letter_name,
    nameBo: row.letter_name_bo,
    romanization: row.romanization,
    section: row.section,
    row: row.row,
    column: row.col,
    columnName: row.column_name,
    series: row.series,
    mark: row.mark,
    markCodePoint: row.mark_cp,
    carrier: row.carrier,
    position: row.position,
    exampleSyllable: row.example_syllable,
    value: row.value,
    speakRef: row.speak_ref as VocabId | null,
    recognitionOnly: flag(row.recognition_only),
    mirrors: row.mirrors as LetterId | null,
    audio: row.audio_path === null ? null : toAudioRef(row.audio_path, row.audio_available),
    confusables: confusables.map(c => c.confusable_id as LetterId),
  };
}

export function toReadRule(row: ReadRuleRow, requires: readonly ReadRuleRequiresRow[]): ReadRule {
  return {
    id: row.id as ReadRuleId,
    statement: row.statement,
    section: row.section,
    card: row.card,
    requires: requires.map(r => r.requires_id as ReadRuleId),
  };
}

/**
 * A discriminated value the switch above did not handle.
 *
 * Unreachable while the generated unions and these switches agree, which the
 * compiler checks. It exists so that a database built by a newer pipeline than the
 * app was generated against fails by name rather than by returning undefined.
 */
function unhandled(value: never, what: string): never {
  throw new Error(`content: unhandled ${what} ${JSON.stringify(value)}`);
}
