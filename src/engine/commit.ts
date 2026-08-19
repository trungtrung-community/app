/**
 * @fileoverview commit() — the answer state machine.
 *
 * docs/03 §2 in one reducer: single-target commits on tap and multi-part on
 * Check; a miss re-enters once, 3–5 positions later, as a different record whose
 * answer was never revealed; a revealed answer returns only in the second look.
 * §4.4's second look splices at the closing boundary — every miss, in the order
 * missed, the original exercise — and its misses go to the summary, never back
 * into the queue. A session always ends: there is no fail state anywhere below.
 *
 * The reducer returns events rather than side effects. The use case folds them
 * into `Progress`; the engine itself touches no port.
 */

import {intBetween, shuffled, type Rng} from './rng';
import type {QueueEntry, SeedExercise, SessionState} from './session';

export type CommitInput =
  | {readonly kind: 'continue'}
  | {readonly kind: 'tap'; readonly itemId: string}
  | {readonly kind: 'check'; readonly picked: readonly string[]}
  | {readonly kind: 'pair'; readonly a: string; readonly b: string}
  | {readonly kind: 'finish'};

export type SessionSummary = {
  readonly capabilities: readonly string[];
  readonly taughtItemIds: readonly string[];
  readonly worthAnotherLook: readonly string[];
};

export type SessionEvent =
  | {readonly kind: 'taught'; readonly itemId: string}
  | {readonly kind: 'correct'; readonly itemId: string}
  | {readonly kind: 'missed'; readonly itemId: string}
  | {readonly kind: 'requeued'; readonly itemId: string; readonly at: number}
  | {readonly kind: 'second-look-added'; readonly count: number}
  | {readonly kind: 'ended'; readonly summary: SessionSummary};

export type CommitOutcome = {
  readonly state: SessionState;
  readonly events: readonly SessionEvent[];
};

const UNCHANGED = (state: SessionState): CommitOutcome => ({state, events: []});

export function commit(state: SessionState, input: CommitInput, rng: Rng): CommitOutcome {
  if (state.phase === 'ended') {
    return UNCHANGED(state);
  }
  switch (input.kind) {
    case 'continue':
      return handleContinue(state, rng);
    case 'tap':
      return handleTap(state, input.itemId, rng);
    case 'check':
      return handleCheck(state, input.picked);
    case 'pair':
      return handlePair(state, input.a, input.b);
    case 'finish':
      return handleFinish(state);
    default:
      return UNCHANGED(state);
  }
}

function current(state: SessionState): QueueEntry | undefined {
  return state.queue[state.index];
}

function currentExercise(state: SessionState): SeedExercise | null {
  const entry = current(state);
  return entry?.position.kind === 'exercise' ? entry.position.exercise : null;
}

function handleContinue(state: SessionState, rng: Rng): CommitOutcome {
  if (state.answered !== null) {
    return advance({...state, answered: null}, rng, []);
  }
  const entry = current(state);
  if (entry === undefined) {
    return UNCHANGED(state);
  }
  switch (entry.position.kind) {
    case 'card': {
      const itemId = entry.position.itemId;
      const taught = state.taught.includes(itemId) ? state.taught : [...state.taught, itemId];
      return advance({...state, taught}, rng, [{kind: 'taught', itemId}]);
    }
    case 'intro':
    case 'note':
    case 'moment':
    case 'second-look-intro':
      return advance(state, rng, []);
    default:
      // An unanswered exercise does not skip, and the end takes `finish`.
      return UNCHANGED(state);
  }
}

/**
 * Step forward one entry. Arriving at the closing boundary with misses in hand
 * is the one place the second look can splice in, and it does so exactly once.
 */
function advance(state: SessionState, rng: Rng, events: readonly SessionEvent[]): CommitOutcome {
  const index = state.index + 1;
  let next: SessionState = {...state, index};
  if (index === next.closingAt && !next.secondLookAdded && next.misses.length > 0) {
    const intro: QueueEntry = {
      key: 'sl',
      position: {kind: 'second-look-intro', count: next.misses.length},
      ask: 'second-look',
    };
    const retries: QueueEntry[] = next.misses.map((miss, i) => ({
      key: `sl:${i}`,
      position: {kind: 'exercise', exercise: miss.exercise},
      ask: 'second-look',
      options: shuffled(rng, miss.exercise.options),
    }));
    const added = [intro, ...retries];
    next = {
      ...next,
      queue: [...next.queue.slice(0, index), ...added, ...next.queue.slice(index)],
      closingAt: next.closingAt + added.length,
      secondLookAdded: true,
    };
    return {state: next, events: [...events, {kind: 'second-look-added', count: retries.length}]};
  }
  return {state: next, events};
}

function handleTap(state: SessionState, tapped: string, rng: Rng): CommitOutcome {
  const entry = current(state);
  const exercise = currentExercise(state);
  if (entry === undefined || exercise === null || state.answered !== null) {
    return UNCHANGED(state);
  }
  if (exercise.commitMode !== 'tap') {
    return UNCHANGED(state);
  }
  const options = entry.options ?? exercise.options;
  const answer = options.find(option => option.isAnswer);
  const picked = options.find(option => option.itemId === tapped);
  if (picked === undefined || answer === undefined) {
    return UNCHANGED(state);
  }

  if (picked.isAnswer) {
    const next: SessionState = {
      ...state,
      answered: {key: entry.key, verdict: 'correct', answerItemId: answer.itemId},
    };
    const events: SessionEvent[] =
      exercise.itemId === null ? [] : [{kind: 'correct', itemId: exercise.itemId}];
    return {state: next, events};
  }

  return handleMiss(state, entry, exercise, answer.itemId, rng);
}

function handleMiss(
  state: SessionState,
  entry: QueueEntry,
  exercise: SeedExercise,
  answerItemId: string,
  rng: Rng,
): CommitOutcome {
  const itemId = exercise.itemId;
  const events: SessionEvent[] = itemId === null ? [] : [{kind: 'missed', itemId}];
  let next: SessionState = {
    ...state,
    answered: {key: entry.key, verdict: 'wrong', answerItemId},
    revealed: state.revealed.includes(exercise.exerciseId)
      ? state.revealed
      : [...state.revealed, exercise.exerciseId],
  };

  if (itemId === null) {
    return {state: next, events};
  }

  if (entry.ask === 'second-look') {
    const stillMissed = next.stillMissed.includes(itemId)
      ? next.stillMissed
      : [...next.stillMissed, itemId];
    return {state: {...next, stillMissed}, events};
  }

  if (entry.ask === 'requeue') {
    // Once means once: the original miss already sits in `misses`.
    return {state: next, events};
  }

  next = {...next, misses: [...next.misses, {itemId, exercise}]};

  if (next.requeued.includes(itemId)) {
    return {state: next, events};
  }
  const replacement = pickReplacement(next, itemId, exercise);
  if (replacement === null) {
    // Nothing unrevealed to ask; the miss waits for the second look.
    return {state: next, events};
  }
  const at = Math.min(next.index + intBetween(rng, 3, 5), next.closingAt);
  const requeueEntry: QueueEntry = {
    key: `rq:${itemId}`,
    position: {kind: 'exercise', exercise: replacement},
    ask: 'requeue',
    options: shuffled(rng, replacement.options),
  };
  next = {
    ...next,
    queue: [...next.queue.slice(0, at), requeueEntry, ...next.queue.slice(at)],
    closingAt: next.closingAt + 1,
    requeued: [...next.requeued, itemId],
  };
  return {state: next, events: [...events, {kind: 'requeued', itemId, at}]};
}

/**
 * A different record for the missed item: never one whose answer a band has
 * revealed, never one already in the queue, preferring a type the item has not
 * met in this session.
 */
function pickReplacement(
  state: SessionState,
  itemId: string,
  missed: SeedExercise,
): SeedExercise | null {
  const asked = new Set<string>();
  const seenTypes = new Set<string>();
  for (const entry of state.queue) {
    if (entry.position.kind === 'exercise') {
      asked.add(entry.position.exercise.exerciseId);
      if (entry.position.exercise.itemId === itemId) {
        seenTypes.add(entry.position.exercise.exerciseType);
      }
    }
  }
  const candidates = (state.poolByItem[itemId] ?? []).filter(
    candidate =>
      candidate.exerciseId !== missed.exerciseId &&
      !state.revealed.includes(candidate.exerciseId) &&
      !asked.has(candidate.exerciseId),
  );
  return (
    candidates.find(candidate => !seenTypes.has(candidate.exerciseType)) ?? candidates[0] ?? null
  );
}

function handleCheck(state: SessionState, picked: readonly string[]): CommitOutcome {
  const entry = current(state);
  const exercise = currentExercise(state);
  if (entry === undefined || exercise === null || state.answered !== null) {
    return UNCHANGED(state);
  }
  if (exercise.commitMode !== 'check') {
    return UNCHANGED(state);
  }
  const answers =
    exercise.answers ??
    exercise.options.filter(option => option.isAnswer).map(option => option.itemId);
  const pickedSet = new Set(picked);
  const complete = answers.every(a => pickedSet.has(a)) && picked.length === answers.length;
  if (complete) {
    const next: SessionState = {
      ...state,
      answered: {key: entry.key, verdict: 'correct', answerItemId: exercise.itemId},
    };
    const events: SessionEvent[] =
      exercise.itemId === null ? [] : [{kind: 'correct', itemId: exercise.itemId}];
    return {state: next, events};
  }
  // Right picks fill and stay; wrong picks simply are not kept. The entry stays
  // active, so the learner completes it rather than being advanced past it.
  const right = picked.filter(p => answers.includes(p));
  const filled = [...new Set([...state.filled, ...right])];
  return {state: {...state, filled}, events: []};
}

function handlePair(state: SessionState, a: string, b: string): CommitOutcome {
  const entry = current(state);
  const exercise = currentExercise(state);
  if (entry === undefined || exercise === null || state.answered !== null) {
    return UNCHANGED(state);
  }
  if (exercise.commitMode !== 'pairs') {
    return UNCHANGED(state);
  }
  const onBoard = exercise.options.some(option => option.itemId === a);
  if (a !== b || !onBoard || state.matched.includes(a)) {
    // A wrong pair shakes on screen and nothing else happens — no miss, ever.
    return UNCHANGED(state);
  }
  const matched = [...state.matched, a];
  const cleared = exercise.options.every(option => matched.includes(option.itemId));
  if (!cleared) {
    return {state: {...state, matched}, events: []};
  }
  const next: SessionState = {
    ...state,
    matched,
    answered: {key: entry.key, verdict: 'correct', answerItemId: null},
  };
  const events: SessionEvent[] =
    exercise.itemId === null ? [] : [{kind: 'correct', itemId: exercise.itemId}];
  return {state: next, events};
}

function handleFinish(state: SessionState): CommitOutcome {
  const entry = current(state);
  if (entry?.position.kind !== 'end') {
    return UNCHANGED(state);
  }
  const summary: SessionSummary = {
    capabilities: entry.position.capabilities,
    taughtItemIds: state.taught,
    worthAnotherLook: state.stillMissed,
  };
  return {state: {...state, phase: 'ended'}, events: [{kind: 'ended', summary}]};
}
