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
import type {ContentItemId, LetterId, PhraseId, StopId, VocabId} from '../ports/content-ids';
import type {Letter, PhraseItem, Stop, VocabularyItem} from '../ports/content-model';
import type {DictionarySource, ExerciseSource, WalkSource} from '../ports/content-source';

import {letterDisplayItem, type DisplayItem} from './display-item';
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
  /** One method, not the whole `ScriptReferenceSource`: resolution only reads. */
  readonly script: {getLetter(id: LetterId): Promise<Letter>};
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

/** What `itemsById` resolves to: full dictionary records, letters reduced. */
export type SessionItem = VocabularyItem | PhraseItem | DisplayItem;

export type StopSession = {
  readonly stop: Stop;
  readonly state: SessionState;
  readonly itemsById: ReadonlyMap<ContentItemId, SessionItem>;
  /** The stop's artifact item ids, for the G4 sheet. Off the queue and the bar. */
  readonly artifacts: readonly string[];
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
  const kinds = new Map<string, 'vocab' | 'phrase' | 'letter'>();
  for (const item of stop.items) {
    if (item.kind === 'vocab' || item.kind === 'phrase' || item.kind === 'letter') {
      kinds.set(item.id, item.kind);
    }
  }
  // A stack, syllable, word or mark target has no port to load it yet — the
  // tables exist but StackSource is a later task. Until it lands, the exercise
  // prompt is what startStop can reach: it carries the glyph and the reading,
  // which is everything the SK1 card and the option lists draw. Replaced by a
  // real lookup when the ports task adds one.
  const synthesized = new Map<ContentItemId, DisplayItem>();
  for (const exercise of exercises) {
    const target = exercise.target;
    if (target === null) {
      continue;
    }
    if (target.kind !== 'vocab' && target.kind !== 'phrase' && target.kind !== 'letter') {
      if (exercise.prompt.bo !== null && !synthesized.has(target.id)) {
        synthesized.set(target.id, {
          id: target.id,
          kind: target.kind,
          bo: exercise.prompt.bo,
          roman: exercise.prompt.roman ?? '',
          en: exercise.prompt.en ?? '',
        });
      }
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
    [...kinds].map(async ([itemId, kind]): Promise<[ContentItemId, SessionItem]> => {
      const record =
        kind === 'vocab'
          ? await deps.dictionary.getVocabulary(itemId as VocabId)
          : kind === 'phrase'
            ? await deps.dictionary.getPhrase(itemId as PhraseId)
            : letterDisplayItem(await deps.script.getLetter(itemId as LetterId));
      return [itemId as ContentItemId, record];
    }),
  );

  // A dictionary record wins over a synthesized one for the same id.
  return {
    stop,
    state: createSession(seed, rng),
    itemsById: new Map<ContentItemId, SessionItem>([...synthesized, ...entries]),
    artifacts: seed.artifacts ?? [],
  };
}
