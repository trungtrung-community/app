/**
 * @fileoverview planSession — the stop script becomes an engine seed.
 *
 * The engine may import only engine and domain, so the 16-type exercise union is
 * translated here, once, into the engine's own vocabulary. Substitution and
 * hiding happen in the same pass: docs/03 §4.1 calls audio-free every stop's
 * normal state, and §7's dossiers say per type what runs without a take, what
 * substitutes, and what disappears. A hidden drill emits no seed position at
 * all, so the progress bar never counts it.
 *
 * The plan emits only presentations the stop screen can render — the
 * `RENDERABLE_PRESENTATIONS` allow-list. Everything else hides, whatever its
 * commit mode, until a renderer (or an audio player) exists for it.
 *
 * Pure: no ports, no randomness. The shuffle belongs to the engine.
 */

import type {CommitMode, SeedExercise, SeedPosition, SessionSeed} from '../engine/session';
import type {Exercise} from '../ports/content-exercise';
import type {ExerciseId} from '../ports/content-ids';
import type {StopPosition} from '../ports/content-model';

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
  'see-it-say-it': 'none',
  'read-it-aloud': 'none',
};

/**
 * What the stop screen renders today. A presentation outside this set hides —
 * an unblocked listen-pick has no audio control yet, and rendering the target
 * script as its prompt would show the answer.
 */
const RENDERABLE_PRESENTATIONS: ReadonlySet<string> = new Set([
  'meaning-pick',
  'meaning-pick-substitute',
  'phrase-recognise-script',
  'pair-match',
]);

/**
 * The audio gate and the renderable gate, in that order. Returns the
 * presentation to run the drill under, or null when the drill must hide —
 * because it cannot run without a take (its prompt IS the audio), or because no
 * renderer for it exists yet.
 */
function presentationFor(exercise: Exercise): string | null {
  const presentation = substitutedPresentation(exercise);
  return RENDERABLE_PRESENTATIONS.has(presentation) ? presentation : null;
}

/** The audio substitutions of docs/03 §7: a blocked prompt swaps to a silent sibling. */
function substitutedPresentation(exercise: Exercise): string {
  if (exercise.blockedOn !== 'audio') {
    return exercise.type;
  }
  switch (exercise.type) {
    case 'listen-pick':
      // The meaning-pick sibling over the same four options (§7 A2).
      return 'meaning-pick-substitute';
    case 'phrase-recognise':
      return 'phrase-recognise-script';
    default:
      return exercise.type;
  }
}

function toSeedExercise(exercise: Exercise): SeedExercise | null {
  const presentation = presentationFor(exercise);
  if (presentation === null) {
    return null;
  }
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
 * silently drop them.
 */
export function planSession(
  positions: readonly StopPosition[],
  exercisesById: ReadonlyMap<ExerciseId, Exercise>,
): SessionSeed {
  const planned: SeedPosition[] = [];
  const poolByItem: Record<string, SeedExercise[]> = {};

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
        planned.push({kind: 'card', card: 'artifact', itemId: position.itemId});
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
        const seedExercise = toSeedExercise(resolve(exercisesById, position.exerciseId));
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
  return {stopId, positions: planned, poolByItem};
}
