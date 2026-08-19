/**
 * @fileoverview planSession — the stop script becomes an engine seed.
 *
 * The engine may import only engine and domain, so the 16-type exercise union is
 * translated here, once, into the engine's own vocabulary. Whether a drill runs,
 * and under which presentation, is a ladder per type: the audio form first, then
 * the silent sibling, then hidden. docs/03 §4.1 calls audio-free every stop's
 * normal state, and §7's dossiers say per type what runs without a take, what
 * substitutes, and what disappears. A hidden drill emits no seed position at
 * all, so the progress bar never counts it.
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

import type {CommitMode, SeedExercise, SeedPosition, SessionSeed} from '../engine/session';
import type {Exercise} from '../ports/content-exercise';
import type {ExerciseId} from '../ports/content-ids';
import type {StopPosition} from '../ports/content-model';

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
const COMMIT_MODES: Record<Exercise['type'], CommitMode> = {
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
 * generic answer list already draws.
 */
const RENDERABLE_PRESENTATIONS: ReadonlySet<string> = new Set([
  'meaning-pick',
  'meaning-pick-substitute',
  'phrase-recognise-script',
  'pair-match',
  'see-it-say-it',
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
  'build-the-stack': ['build-the-stack', null],
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

function toSeedExercise(
  exercise: Exercise,
  ctx: PlanContext,
  warmUp: boolean,
): SeedExercise | null {
  const presentation = presentationFor(exercise, ctx);
  if (presentation === null) {
    return null;
  }
  const ordered = phraseArrangeOrder(exercise);
  return {
    exerciseId: exercise.id,
    itemId: exercise.target?.id ?? null,
    exerciseType: exercise.type,
    presentation,
    commitMode: COMMIT_MODES[exercise.type],
    options: exercise.options.map(option => ({
      itemId: option.itemId,
      isAnswer: option.isAnswer,
    })),
    ...(ordered === undefined ? {} : {ordered}),
    ...(warmUp ? {warmUp: true as const} : {}),
  };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled member: ${JSON.stringify(value)}`);
}

function resolve(
  exercisesById: ReadonlyMap<ExerciseId, Exercise>,
  exerciseId: ExerciseId,
): Exercise {
  const exercise = exercisesById.get(exerciseId);
  if (exercise === undefined) {
    throw new Error(`The script names ${exerciseId} but the stop's exercises do not carry it`);
  }
  return exercise;
}

/**
 * Translate a stop's script into a session seed.
 *
 * Exhaustive over all 15 position kinds — `warm-up` and `assembly` carry
 * exercises exactly like `exercise` does, and a runner keyed on one kind would
 * silently drop them. The artifact `card` kind emits no queue position: the
 * fixture places it after `end`, where it could never render, so its item id
 * travels in `SessionSeed.artifacts` and stays off the progress bar.
 */
export function planSession(
  positions: readonly StopPosition[],
  exercisesById: ReadonlyMap<ExerciseId, Exercise>,
  ctx: PlanContext,
): SessionSeed {
  const planned: SeedPosition[] = [];
  const poolByItem: Record<string, SeedExercise[]> = {};
  const artifacts: string[] = [];

  for (const position of positions) {
    switch (position.kind) {
      case 'intro':
        planned.push({
          kind: 'intro',
          text: position.text,
          outcome: position.outcome,
          capabilities: position.capabilities,
        });
        break;
      case 'word-card':
        planned.push({kind: 'card', card: 'word', itemId: position.itemId});
        break;
      case 'phrase-card':
        planned.push({kind: 'card', card: 'phrase', itemId: position.itemId});
        break;
      case 'letter-card':
        planned.push({kind: 'card', card: 'letter', itemId: position.itemId});
        break;
      case 'stack-card':
        planned.push({kind: 'card', card: 'stack', itemId: position.itemId});
        break;
      case 'card':
        artifacts.push(position.itemId);
        break;
      case 'rule-card':
      case 'rule-statement':
      case 'rule-reprise':
      case 'tip':
        planned.push({kind: 'note', text: position.text});
        break;
      case 'warm-up':
      case 'exercise':
      case 'assembly': {
        const seedExercise = toSeedExercise(
          resolve(exercisesById, position.exerciseId),
          ctx,
          position.kind === 'warm-up',
        );
        if (seedExercise === null) {
          break;
        }
        planned.push({kind: 'exercise', exercise: seedExercise});
        if (seedExercise.itemId !== null && seedExercise.commitMode === 'tap') {
          (poolByItem[seedExercise.itemId] ??= []).push(seedExercise);
        }
        break;
      }
      case 'moment':
        planned.push({kind: 'moment'});
        break;
      case 'end':
        planned.push({kind: 'end', capabilities: position.capabilities});
        break;
      default:
        assertNever(position);
    }
  }

  const stopId = positions[0]?.stopId ?? '';
  return {stopId, positions: planned, poolByItem, artifacts};
}
