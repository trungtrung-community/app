/**
 * @fileoverview The exercise → SeedExercise translation vocabulary.
 *
 * The engine may import only engine and domain, so the 16-type exercise union
 * is translated here, once, into the engine's own vocabulary. Both planners —
 * the stop's `planSession` and the drill machine's `planDrill` — run their
 * exercises through this module, so what renders, what substitutes and what
 * hides is decided in exactly one place and the two cannot drift.
 *
 * Whether a drill runs, and under which presentation, is a ladder per type:
 * the audio form first, then the silent sibling, then hidden. docs/03 §4.1
 * calls audio-free every stop's normal state, and §7's dossiers say per type
 * what runs without a take, what substitutes, and what disappears. A hidden
 * drill returns no seed exercise at all, so the progress bar never counts it.
 *
 * The ladder replaced a blockedOn-only substitution on purpose: the old rule
 * substituted only while `blockedOn === 'audio'`, so the day recordings landed
 * and blockedOn went null, every listen-pick and phrase-recognise would have
 * resolved to its own unrenderable name and vanished — 184 of the fixture's 430
 * drills. Falling through to the silent sibling whenever the audio form has no
 * renderer is what keeps them on screen.
 *
 * `COMMIT_MODES['see-it-say-it']` is `'tap'` as a correction: docs/03 §1 and
 * the RB7 dossier class it tap-select (text), recognition — "the name says
 * 'say' and the answer is a tap — the mic is RB13's job" — and all four fixture
 * rows carry four options. It was 'none' here before, which also kept it off
 * the screen.
 *
 * Pure: no ports, no randomness. Audio availability arrives as a value in
 * `PlanContext`; the shuffle belongs to the engine.
 */

import type {CommitMode, SeedChangePair, SeedExercise, SessionOption} from '../engine/session';
import {lettersOf} from '../domain/tibetan';
import type {Exercise, StackSlots} from '../ports/content-exercise';
import type {ChangePair} from '../ports/content-model';

/** What the planner needs to know about the build, handed in as values. */
export type PlanContext = {
  /** Whether this build ships any recordings — `AudioSource.isAvailable()`. */
  readonly audioAvailable: boolean;
  /** The learner's audio-free switch (A1). */
  readonly audioFree: boolean;
};

/**
 * How each exercise type commits — docs/03 §2's commit rule, decided once here.
 */
export const COMMIT_MODES: Record<Exercise['type'], CommitMode> = {
  'listen-pick': 'tap',
  'meaning-pick': 'tap',
  'phrase-recognise': 'tap',
  'phrase-cloze': 'tap',
  'hear-it-find-it': 'tap',
  'read-a-word': 'tap',
  'spot-it': 'tap',
  'find-the-root': 'tap',
  'phrase-arrange': 'check',
  'build-the-stack': 'check',
  'sort-what-changed': 'check',
  'what-attaches': 'check',
  'pair-match': 'pairs',
  'phrase-produce': 'none',
  'see-it-say-it': 'tap',
  'read-it-aloud': 'none',
};

/**
 * What the stop screen renders today. A presentation outside this set hides —
 * an unblocked listen-pick has no audio control yet, and rendering the target
 * script as its prompt would show the answer. see-it-say-it is here because it
 * is a plain tap-select over four labelled sounds (docs/03 §1), which the
 * generic answer list already draws. The coming renderer work grows this one
 * set; nothing else may keep a second copy of it.
 */
export const RENDERABLE_PRESENTATIONS: ReadonlySet<string> = new Set([
  'meaning-pick',
  'meaning-pick-substitute',
  'phrase-recognise-script',
  'pair-match',
  'see-it-say-it',
  // The audio-gated shells: renderers exist, and the ladder still hides each
  // drill while its take is missing (blockedOn) or the build ships none
  // (audioAvailable). They surface the day recordings land, with no code
  // change beyond the manifest.
  'hear-it-find-it',
  'phrase-produce',
  'read-it-aloud',
  // The Read stop-loop renderers (WS3-C): the glyph and stack drills, the
  // multi-selects, and the crossing's read-a-word. All run without a take —
  // their prompts are written on the frame.
  'spot-it',
  'find-the-root',
  'sort-what-changed',
  'what-attaches',
  'read-a-word',
  'build-the-stack',
]);

/**
 * The presentation ladder of the audio-prompted and audio-compared types:
 * the audio form, then the silent sibling that can run without a take, or
 * null where the prompt IS the audio and nothing can substitute (docs/03 §7).
 * The silent types are absent — they run as themselves and take no gate.
 */
const AUDIO_LADDER = {
  'listen-pick': ['listen-pick', 'meaning-pick-substitute'],
  'phrase-recognise': ['phrase-recognise', 'phrase-recognise-script'],
  'phrase-cloze': ['phrase-cloze', null],
  'phrase-arrange': ['phrase-arrange', null],
  'phrase-produce': ['phrase-produce', null],
  'read-it-aloud': ['read-it-aloud', null],
  // build-the-stack left the ladder (WS3-C): the RB12 frame writes its prompt
  // on screen — "It sounds like drip." — with the take as an enrichment, so a
  // missing recording degrades the drill rather than hiding it. The board
  // draws that line on the audio-only specimen itself.
  'hear-it-find-it': ['hear-it-find-it', null],
} as const satisfies Partial<Record<Exercise['type'], readonly [string, string | null]>>;

type AudioGatedType = keyof typeof AUDIO_LADDER;

function isAudioGated(type: Exercise['type']): type is AudioGatedType {
  return type in AUDIO_LADDER;
}

/**
 * Types no build may surface, whatever the ladder says. phrase-arrange stands
 * excluded while the content board's REVIEW-2 flag stands — 178 phrase chunk
 * boundaries are unconfirmed, so a chip tray built from them could drill a
 * wrong segmentation. A future renderer plus audio must not lift this
 * silently; delete the entry when REVIEW-2 closes.
 */
const EXCLUDED_UNTIL_REVIEWED: ReadonlySet<Exercise['type']> = new Set(['phrase-arrange']);

/**
 * Whether the drill may not use its audio form: the content says it has no
 * take, the learner asked for audio-free, or the build ships no recordings.
 * Applied to the audio-gated types only — a silent type never consults it.
 */
function audioBlocked(exercise: Exercise, ctx: PlanContext): boolean {
  return exercise.blockedOn === 'audio' || ctx.audioFree || !ctx.audioAvailable;
}

/**
 * Walk the ladder to the presentation the drill runs under, or null when it
 * must hide. Unblocked, the audio form is preferred but falls through to the
 * silent sibling when no renderer for it exists; blocked, only the silent
 * sibling can run.
 */
function presentationFor(exercise: Exercise, ctx: PlanContext): string | null {
  if (EXCLUDED_UNTIL_REVIEWED.has(exercise.type)) {
    return null;
  }
  if (!isAudioGated(exercise.type)) {
    return RENDERABLE_PRESENTATIONS.has(exercise.type) ? exercise.type : null;
  }
  const [audioForm, silentSibling] = AUDIO_LADDER[exercise.type];
  if (!audioBlocked(exercise, ctx) && RENDERABLE_PRESENTATIONS.has(audioForm)) {
    return audioForm;
  }
  if (silentSibling !== null && RENDERABLE_PRESENTATIONS.has(silentSibling)) {
    return silentSibling;
  }
  return null;
}

/**
 * The arrange answer sequence: the target phrase's own chunks in written
 * order. Per `src/ports/content-exercise.ts` the exercise stores only decoys,
 * so any target-phrase chunk it carries is an answer chunk, ordered by the
 * chunk's own ordinal. Undefined while the content ships no answer chunks —
 * an empty sequence would commit an empty tray as correct.
 */
export function phraseArrangeOrder(exercise: Exercise): readonly string[] | undefined {
  if (exercise.type !== 'phrase-arrange' || exercise.target === null) {
    return undefined;
  }
  const targetId = exercise.target.id;
  const answer = exercise.chunks
    .filter(ref => ref.chunk.phraseId === targetId)
    .sort((a, b) => a.chunk.ordinal - b.chunk.ordinal)
    .map(ref => ref.chunk.id);
  return answer.length > 0 ? answer : undefined;
}

/** The combining-mark carrier the tray chips ride on (§2.4, U+25CC). */
const CARRIER = '◌';

/**
 * A chip or slot value in its canonical spelling: the carrier stripped, and a
 * subjoined consonant mapped to the base letter it is a form of. The answer
 * slots store base letters (`subscript: ["ཡ"]`) while the tray chips carry the
 * subjoined form on its carrier (`◌ྱ`), and both must compare equal. A vowel
 * mark survives as itself — `lettersOf` drops it, so the fallback keeps it.
 */
function canonicalChipValue(value: string): string {
  const stripped = value.split(CARRIER).join('');
  return lettersOf(stripped)[0] ?? stripped;
}

/**
 * One placement as the engine compares it: `slot:value`, canonical spelling.
 * The same function builds the answer set and the renderer's picks, so the
 * two cannot disagree about what a placed chip is called.
 *
 * @example stackSlotToken('subscript', '◌ྱ') // 'subscript:ཡ'
 */
export function stackSlotToken(slot: keyof StackSlots, value: string): string {
  return `${slot}:${canonicalChipValue(value)}`;
}

/**
 * The build answer as `slot:value` tokens. The inherent `a` is absence — an
 * empty vowel slot emits no token, so an untouched vowel row checks correct
 * (§9.1a: an untouched vowel row is an answer).
 */
export function stackAnswers(slots: StackSlots): readonly string[] {
  const tokens: string[] = [];
  const single: readonly (keyof StackSlots)[] = [
    'prefix',
    'superscript',
    'root',
    'vowel',
    'suffix',
    'suffix2',
  ];
  for (const slot of single) {
    const value = slots[slot];
    if (typeof value === 'string') {
      tokens.push(stackSlotToken(slot, value));
    }
  }
  for (const value of slots.subscript ?? []) {
    tokens.push(stackSlotToken('subscript', value));
  }
  return tokens;
}

/**
 * The tappable positions of a find-the-root stack: every code point of the
 * glyph, `{index, bo}` in writing order, encoded as `index:bo` option ids.
 * The payload's `answer_index` indexes exactly this decomposition — ཏྲ is
 * position 0 = ཏ and position 1 = ྲ — which is what settles the unit: the
 * fixture's answers name a letter INSIDE the stack, not a line letter.
 */
export function findTheRootOptions(glyph: string, answerIndex: number): readonly SessionOption[] {
  return Array.from(glyph).map((bo, index) => ({
    itemId: `${index}:${bo}`,
    isAnswer: index === answerIndex,
  }));
}

function toSeedChangePair(pair: ChangePair): SeedChangePair {
  return {
    itemId: pair.id,
    bo: pair.bo,
    roman: pair.reading,
    bareBo: pair.bareBo,
    bareRoman: pair.bareReading,
    changed: pair.changed,
  };
}

/** The R11 recap rows in the engine's vocabulary, shared with the end position. */
export function toSeedChangePairs(pairs: readonly ChangePair[]): readonly SeedChangePair[] {
  return pairs.map(toSeedChangePair);
}

/**
 * What this type's renderer reads beyond the shared core, and the answers the
 * engine checks against — populated at plan time so `handleCheck` never has to
 * know a content type. Only the fields the payload actually carries are set.
 */
function seedExtras(exercise: Exercise): Partial<SeedExercise> {
  switch (exercise.type) {
    case 'spot-it':
      return {
        question: exercise.question,
        ...(exercise.glyph === null ? {} : {glyph: exercise.glyph}),
        ...(exercise.reason === null ? {} : {reason: exercise.reason}),
      };
    case 'find-the-root':
      return {
        glyph: exercise.glyph,
        ...(exercise.reason === null ? {} : {reason: exercise.reason}),
      };
    case 'read-a-word':
    case 'see-it-say-it':
      return {glyph: exercise.glyph};
    case 'sort-what-changed':
      return {
        question: exercise.question,
        pairs: toSeedChangePairs(exercise.pairs),
        answers: exercise.pairs.filter(pair => pair.changed).map(pair => pair.id),
      };
    case 'what-attaches':
      return {
        question: exercise.question,
        root: exercise.root,
        answers: exercise.answers,
      };
    case 'build-the-stack':
      return {
        ...(exercise.glyph === null ? {} : {glyph: exercise.glyph}),
        reading: exercise.reading,
        answers: stackAnswers(exercise.answerSlots),
        tray: {
          thirty: exercise.chips,
          superscripts: exercise.superscriptChips,
          subscripts: exercise.subscriptChips,
          vowels: exercise.vowelChips,
        },
      };
    default:
      return {};
  }
}

/**
 * Translate one exercise into the engine's vocabulary, or null when the
 * ladder hides it under this context.
 */
export function toSeedExercise(
  exercise: Exercise,
  ctx: PlanContext,
  warmUp: boolean,
): SeedExercise | null {
  const presentation = presentationFor(exercise, ctx);
  if (presentation === null) {
    return null;
  }
  const ordered = phraseArrangeOrder(exercise);
  // find-the-root ships no option rows: its options ARE the glyph's positions.
  const options =
    exercise.type === 'find-the-root'
      ? findTheRootOptions(exercise.glyph, exercise.answerIndex)
      : exercise.options.map(option => ({
          itemId: option.itemId,
          isAnswer: option.isAnswer,
          ...(option.label === null ? {} : {label: option.label}),
        }));
  return {
    exerciseId: exercise.id,
    itemId: exercise.target?.id ?? null,
    exerciseType: exercise.type,
    presentation,
    commitMode: COMMIT_MODES[exercise.type],
    options,
    ...(ordered === undefined ? {} : {ordered}),
    ...(warmUp ? {warmUp: true as const} : {}),
    ...seedExtras(exercise),
  };
}
