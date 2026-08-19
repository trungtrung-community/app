/**
 * @fileoverview planSession — the stop script becomes an engine seed.
 *
 * The exercise → SeedExercise translation itself lives in
 * `./exercise-seed.ts`, shared with the drill planner so the two cannot
 * drift; what this module owns is the walk over the stop's positions.
 *
 * Pure: no ports, no randomness. Audio availability arrives as a value in
 * `PlanContext`; the shuffle belongs to the engine.
 */

import type {SeedExercise, SeedPosition, SessionSeed} from '../engine/session';
import type {Exercise} from '../ports/content-exercise';
import type {ExerciseId} from '../ports/content-ids';
import type {StopPosition} from '../ports/content-model';

import {toSeedExercise, type PlanContext} from './exercise-seed';

export {phraseArrangeOrder, type PlanContext} from './exercise-seed';

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
