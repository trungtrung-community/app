/**
 * @fileoverview startStop — load the stop, plan the session, resolve the items.
 *
 * Takes the narrow capabilities rather than `ContentSource`, so a test hands in
 * five methods instead of twenty-three. Options arrive with `label: null`
 * throughout the content, so every id a screen will draw — card items, targets,
 * distractors — is resolved to its record here, once, into `itemsById`.
 */

import {createSession, type SessionState} from '../engine/session';
import type {Rng} from '../engine/rng';
import type {ContentItemId, PhraseId, StopId, VocabId} from '../ports/content-ids';
import type {PhraseItem, Stop, VocabularyItem} from '../ports/content-model';
import type {DictionarySource, ExerciseSource, WalkSource} from '../ports/content-source';

import {planSession} from './session-plan';

// The store reaches the engine only through this layer, so the session's moving
// parts travel with the use case that needs them handed in.
export {seededRng} from '../engine/rng';
export type {Rng} from '../engine/rng';
export type {SessionState} from '../engine/session';

export type StartStopDeps = {
  readonly walk: WalkSource;
  readonly exercises: ExerciseSource;
  readonly dictionary: DictionarySource;
  /**
   * One question, not the whole `AudioSource`: planning needs to know whether
   * this build ships recordings, and nothing here plays one.
   */
  readonly audio: {isAvailable(): Promise<boolean>};
};

/** What the learner chose, read by the caller from settings. */
export type StartStopOptions = {
  /** The audio-free switch (A1). False before settings hydrate. */
  readonly audioFree: boolean;
};

export type StopSession = {
  readonly stop: Stop;
  readonly state: SessionState;
  readonly itemsById: ReadonlyMap<ContentItemId, VocabularyItem | PhraseItem>;
};

export async function startStop(
  deps: StartStopDeps,
  id: StopId,
  rng: Rng,
  options: StartStopOptions,
): Promise<StopSession> {
  const [stop, script, exercises, audioAvailable] = await Promise.all([
    deps.walk.getStop(id),
    deps.walk.getStopScript(id),
    deps.exercises.listExercisesByStop(id),
    deps.audio.isAvailable(),
  ]);
  const exercisesById = new Map(exercises.map(exercise => [exercise.id, exercise]));
  const seed = planSession(script, exercisesById, {audioAvailable, audioFree: options.audioFree});

  // The kind of every id: the stop's own items know theirs, and an option shares
  // its exercise's target kind, because distractors are drawn from the target's
  // kind by the content rules.
  const kinds = new Map<string, 'vocab' | 'phrase'>();
  for (const item of stop.items) {
    if (item.kind === 'vocab' || item.kind === 'phrase') {
      kinds.set(item.id, item.kind);
    }
  }
  for (const exercise of exercises) {
    const target = exercise.target;
    if (target === null || (target.kind !== 'vocab' && target.kind !== 'phrase')) {
      continue;
    }
    kinds.set(target.id, target.kind);
    for (const option of exercise.options) {
      if (!kinds.has(option.itemId)) {
        kinds.set(option.itemId, target.kind);
      }
    }
  }

  const entries = await Promise.all(
    [...kinds].map(
      async ([itemId, kind]): Promise<[ContentItemId, VocabularyItem | PhraseItem]> => {
        const record =
          kind === 'vocab'
            ? await deps.dictionary.getVocabulary(itemId as VocabId)
            : await deps.dictionary.getPhrase(itemId as PhraseId);
        return [itemId as ContentItemId, record];
      },
    ),
  );

  return {stop, state: createSession(seed, rng), itemsById: new Map(entries)};
}
