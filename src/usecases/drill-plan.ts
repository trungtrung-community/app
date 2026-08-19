/**
 * @fileoverview The drill machine's planner — docs/03 §4.6's selection and mode.
 *
 * `selectSet` applies the second parameter: which of the pool — all, due
 * today, still getting. Only taught items ever drill; an item the walk has not
 * presented is not practice material, it is meeting content out of order, the
 * one thing the walk exists to prevent. `planDrill` applies the third: an
 * engine mode becomes a session seed through the same translation vocabulary
 * the stop planner uses (`./exercise-seed.ts`), and `planFlashcards` deals the
 * deck the flashcard runner shuffles itself.
 *
 * A drill seed differs from a stop seed in exactly two ways, both here: it has
 * no second look — a drill's misses go to the summary's worth-another-look,
 * not into an extra round — and its `poolByItem` is filled from the set alone,
 * so a re-queue replacement can never leak material from outside the pool
 * (§4.6's firewall).
 *
 * Pure: no ports, no `Math.random`. Progress arrives as a value, chance as an
 * injected `Rng`, and audio context as `PlanContext` — the drill runner hands
 * in the real build context exactly as `startStop` does.
 */

import type {IsoDate} from '../domain/date';
import {isDue, isWorthAnotherLook, type ItemProgress} from '../domain/item';
import type {FlashDeckCard} from '../engine/flashcards';
import {shuffled, type Rng} from '../engine/rng';
import type {SeedExercise, SeedPosition, SessionSeed} from '../engine/session';
import type {Progress} from '../ports/progress-store';

import {DRILL_MODES, type DrillModeId} from './drill-modes';
import type {DrillPool, DrillSet} from './drill-pool';
import {toSeedExercise, type PlanContext} from './exercise-seed';

// The store reaches the engine only through this layer — as start-stop.ts does
// for the stop, the drill session's moving parts travel with the planner that
// seeds them.
export {seededRng} from '../engine/rng';
export type {Rng} from '../engine/rng';
export {createSession} from '../engine/session';
export type {SessionState} from '../engine/session';
export {createDeck} from '../engine/flashcards';
export type {FlashDeckState, FlashRating} from '../engine/flashcards';

/** Which of the pool — §4.6's second parameter. */
export type DrillSelection = 'all' | 'due-today' | 'still-getting';

/** Where a resolved set routes — the §4 rule that a set of 1–2 skips the picker. */
export type DrillRoute = 'empty' | 'flashcards' | 'picker';

export type DrillPlanOptions = {
  /**
   * How the questions run: a seeded shuffle (the default), or the set's own
   * order — pass a set through `dueOrder` first for the scheduler's order.
   */
  readonly order?: 'shuffled' | 'due';
  /** Draw this many questions seeded-randomly — the exam knob. */
  readonly sample?: number;
};

/** Five distinct pairs per board — docs/03 §7 V13's minimum. */
const PAIRS_PER_BOARD = 5;

function assertNever(value: never): never {
  throw new Error(`Unhandled member: ${JSON.stringify(value)}`);
}

/**
 * Apply a selection to a pool.
 *
 * Items are filtered to the taught first — an untaught item never drills —
 * and then to the selection's own rule. An exercise survives when its target
 * survives; a targetless exercise (a pair-match board runs over the set, not
 * an item) survives while the set holds anything at all. Null progress is a
 * first launch: nothing is taught, so every selection resolves empty.
 */
export function selectSet(
  pool: DrillPool,
  selection: DrillSelection,
  progress: Progress | null,
  today: IsoDate,
): DrillSet {
  const itemIds = [...pool.itemKinds.keys()].filter(itemId => {
    const item = progress?.items[itemId];
    if (item === undefined || item.state === 'new') {
      return false;
    }
    switch (selection) {
      case 'all':
        return true;
      case 'due-today':
        return isDue(item, today);
      case 'still-getting':
        return isWorthAnotherLook(item, today);
      default:
        return assertNever(selection);
    }
  });
  const kept = new Set(itemIds);
  const exercises = pool.exercises.filter(exercise =>
    exercise.target === null ? kept.size > 0 : kept.has(exercise.target.id),
  );
  return {itemIds, exercises};
}

/**
 * Plan one engine-run drill over a set.
 *
 * The seed never carries a second look — a drill's misses belong to the
 * summary — and one `end` position closes it. `poolByItem` is filled from the
 * set alone, so a re-queue replacement can never leak outside the pool.
 * Whether the set can fill the mode at all is `availableModes`' judgement,
 * not repeated here.
 *
 * @throws when `mode` is `flashcards`, which runs on the deck — use
 *   `planFlashcards`.
 */
export function planDrill(
  set: DrillSet,
  mode: DrillModeId,
  ctx: PlanContext,
  rng: Rng,
  opts: DrillPlanOptions = {},
): SessionSeed {
  if (mode === 'flashcards') {
    throw new Error('flashcards run on the deck, not the engine — use planFlashcards');
  }
  const planned = mode === 'pair-match' ? pairBoards(set, rng) : engineQuestions(set, mode, ctx);
  const drawn = opts.sample === undefined ? planned : sampled(planned, rng, opts.sample);
  const ordered =
    (opts.order ?? 'shuffled') === 'due' ? inSetOrder(drawn, set) : shuffled(rng, drawn);
  const positions: SeedPosition[] = [
    ...ordered.map(exercise => ({kind: 'exercise' as const, exercise})),
    {kind: 'end', capabilities: []},
  ];
  return {
    stopId: `drill:${mode}`,
    positions,
    poolByItem: poolFrom(set, ctx),
    secondLook: false,
  };
}

/** Deal the deck: one card per item. `createDeck` owns the shuffle. */
export function planFlashcards(set: DrillSet): readonly FlashDeckCard[] {
  return set.itemIds.map(itemId => ({itemId}));
}

/**
 * The scheduler's order (Q2): most overdue first — `dueOn` ascending, never-due
 * last — then weakest, `intervalIndex` ascending, ties broken by a seeded
 * shuffle. Words and phrases then interleave by alternating draw while both
 * lists have items; the longer list's tail follows. The exercises are re-sorted
 * to follow the item order, so the set stays consistent with itself.
 */
export function dueOrder(
  set: DrillSet,
  progress: Progress,
  itemKinds: DrillPool['itemKinds'],
  rng: Rng,
): DrillSet {
  // The shuffle runs first and the sort is stable, so equal keys keep a
  // seeded-random order rather than the pool's.
  const sorted = [...shuffled(rng, set.itemIds)].sort((a, b) =>
    compareDue(progress.items[a], progress.items[b]),
  );
  const itemIds = interleaved(sorted, itemKinds);
  const at = new Map(itemIds.map((itemId, index) => [itemId, index]));
  const rank = (targetId: string | undefined): number =>
    targetId === undefined ? itemIds.length : (at.get(targetId) ?? itemIds.length);
  const exercises = [...set.exercises].sort((a, b) => rank(a.target?.id) - rank(b.target?.id));
  return {itemIds, exercises};
}

/** Route a resolved set: nothing to say, straight to the deck, or the picker. */
export function routeForSet(set: DrillSet): DrillRoute {
  if (set.itemIds.length === 0) {
    return 'empty';
  }
  return set.itemIds.length <= 2 ? 'flashcards' : 'picker';
}

/**
 * The mode's questions, translated through the shared vocabulary. Eligibility
 * belongs to the mode registry; the ladder may still hide a translated
 * exercise, and a hidden one is simply absent.
 */
function engineQuestions(
  set: DrillSet,
  mode: DrillModeId,
  ctx: PlanContext,
): readonly SeedExercise[] {
  const registered = DRILL_MODES.find(candidate => candidate.id === mode);
  if (registered === undefined) {
    throw new Error(`Not a drill mode: ${mode}`);
  }
  return set.exercises
    .filter(registered.eligible)
    .map(exercise => toSeedExercise(exercise, ctx, false))
    .filter((exercise): exercise is SeedExercise => exercise !== null);
}

/**
 * Synthesize the pair boards: `ceil(items / 5)` boards of five distinct pairs,
 * dealt from a seeded shuffle of the set's items. The last board is topped up
 * from the set's own items when the count does not divide by five — §4.6's one
 * sanctioned fill, and it never reaches outside the set. Every tile belongs,
 * so every option is an answer (docs/03 §7 V13: no distractors).
 */
function pairBoards(set: DrillSet, rng: Rng): readonly SeedExercise[] {
  const items = shuffled(rng, set.itemIds);
  const boards = Math.ceil(items.length / PAIRS_PER_BOARD);
  const planned: SeedExercise[] = [];
  for (let board = 0; board < boards; board++) {
    const dealt = items.slice(board * PAIRS_PER_BOARD, (board + 1) * PAIRS_PER_BOARD);
    const short = PAIRS_PER_BOARD - dealt.length;
    const fill =
      short > 0
        ? sampled(
            items.filter(itemId => !dealt.includes(itemId)),
            rng,
            short,
          )
        : [];
    planned.push({
      exerciseId: `drill:pairs:${board}`,
      itemId: null,
      exerciseType: 'pair-match',
      presentation: 'pair-match',
      commitMode: 'pairs',
      options: [...dealt, ...fill].map(itemId => ({itemId, isAnswer: true})),
    });
  }
  return planned;
}

/** A seeded draw of `n` without replacement. */
function sampled<T>(list: readonly T[], rng: Rng, n: number): readonly T[] {
  return shuffled(rng, list).slice(0, n);
}

/** Re-sort translated exercises to follow the set's own item order. */
function inSetOrder(exercises: readonly SeedExercise[], set: DrillSet): readonly SeedExercise[] {
  const at = new Map(set.itemIds.map((itemId, index) => [itemId, index]));
  const rank = (exercise: SeedExercise): number =>
    exercise.itemId === null ? set.itemIds.length : (at.get(exercise.itemId) ?? set.itemIds.length);
  return [...exercises].sort((a, b) => rank(a) - rank(b));
}

/**
 * The re-queue pool, from the set alone — the same runnable-tap rule
 * `planSession` applies, over the set's exercises instead of the script's.
 */
function poolFrom(
  set: DrillSet,
  ctx: PlanContext,
): Readonly<Record<string, readonly SeedExercise[]>> {
  const pool: Record<string, SeedExercise[]> = {};
  for (const exercise of set.exercises) {
    const seedExercise = toSeedExercise(exercise, ctx, false);
    if (
      seedExercise !== null &&
      seedExercise.itemId !== null &&
      seedExercise.commitMode === 'tap'
    ) {
      (pool[seedExercise.itemId] ??= []).push(seedExercise);
    }
  }
  return pool;
}

/**
 * `dueOn` ascending with never-due last, then `intervalIndex` ascending.
 * `IsoDate` compares lexicographically. Equal keys return 0, so the stable
 * sort keeps the caller's seeded order.
 */
function compareDue(a: ItemProgress | undefined, b: ItemProgress | undefined): number {
  const dueA = a?.dueOn ?? null;
  const dueB = b?.dueOn ?? null;
  if (dueA !== dueB) {
    if (dueA === null) {
      return 1;
    }
    if (dueB === null) {
      return -1;
    }
    return dueA < dueB ? -1 : 1;
  }
  return (a?.intervalIndex ?? 0) - (b?.intervalIndex ?? 0);
}

/**
 * Alternate words and phrases while both lists have items, starting from the
 * sorted head's own kind so the most due item stays first; the remainder of
 * the longer list follows in order.
 */
function interleaved(
  sorted: readonly string[],
  itemKinds: DrillPool['itemKinds'],
): readonly string[] {
  const words = sorted.filter(itemId => itemKinds.get(itemId) === 'vocab');
  const phrases = sorted.filter(itemId => itemKinds.get(itemId) === 'phrase');
  const headIsPhrase = itemKinds.get(sorted[0] ?? '') === 'phrase';
  const first = headIsPhrase ? phrases : words;
  const second = headIsPhrase ? words : phrases;
  const out: string[] = [];
  let i = 0;
  while (i < first.length && i < second.length) {
    out.push(first[i] as string, second[i] as string);
    i++;
  }
  out.push(...first.slice(i), ...second.slice(i));
  return out;
}
