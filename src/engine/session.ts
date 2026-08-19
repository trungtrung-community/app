/**
 * @fileoverview The session's value types, and the seed becoming a queue.
 *
 * The engine never names a content type: `src/usecases/session-plan.ts` translates
 * the stop script into this vocabulary, already substituted and hidden, so every
 * seed that arrives here is legal to run. What this layer owns is the runtime:
 * the option shuffle, the re-queue, the second look, and the accounting the
 * progress bar leans on.
 *
 * Two structural guarantees carry three spec sentences: the queue only grows, so
 * the bar's total never shrinks; the index only increments, so the bar never
 * moves backwards. The second look growing the total exactly once is the flag
 * `secondLookAdded`.
 *
 * Ids here are plain strings, treated as opaque. Brands are restored at the
 * use-case boundary.
 */

import {shuffled, type Rng} from './rng';

export type SessionOption = {
  readonly itemId: string;
  readonly isAnswer: boolean;
};

/** How an entry commits — docs/03 §2's commit rule, decided at plan time. */
export type CommitMode = 'tap' | 'check' | 'pairs' | 'none';

export type SeedExercise = {
  readonly exerciseId: string;
  /** The target item; feeds progress recording and re-queue identity. */
  readonly itemId: string | null;
  /** The original exercise type; the re-queue prefers types the item has not seen. */
  readonly exerciseType: string;
  /** Renderer key AFTER substitution, e.g. 'meaning-pick-substitute'. */
  readonly presentation: string;
  readonly commitMode: CommitMode;
  /** Stored order, answer first — `createSession` shuffles per entry. */
  readonly options: readonly SessionOption[];
  /** Chip-arrange answer order. */
  readonly ordered?: readonly string[];
  /** Multi-select answers. */
  readonly answers?: readonly string[];
  /** The position kind was `warm-up` — S11 draws its chip off this. */
  readonly warmUp?: true;
};

export type SeedPosition =
  | {
      readonly kind: 'intro';
      readonly text: string;
      readonly outcome: string;
      readonly capabilities: readonly string[];
    }
  | {
      readonly kind: 'card';
      readonly card: 'word' | 'phrase' | 'letter' | 'stack' | 'artifact';
      readonly itemId: string;
    }
  | {readonly kind: 'note'; readonly text: string}
  | {readonly kind: 'exercise'; readonly exercise: SeedExercise}
  | {readonly kind: 'moment'}
  | {readonly kind: 'end'; readonly capabilities: readonly string[]};

export type SessionSeed = {
  readonly stopId: string;
  /** Already substituted and hidden — always legal to run. */
  readonly positions: readonly SeedPosition[];
  /** Runnable answer-bearing exercises per target item; the re-queue draws from here. */
  readonly poolByItem: Readonly<Record<string, readonly SeedExercise[]>>;
  /**
   * Artifact-card item ids the script placed where no queue position can render
   * them. They never enter the queue, so the progress bar never counts them; a
   * later task shows them over the summary (the G4→G3 beat). `planSession`
   * always writes it; a hand-built seed without artifact cards may omit it.
   */
  readonly artifacts?: readonly string[];
  /** Whether the second look may splice at the closing boundary. Default true. */
  readonly secondLook?: boolean;
};

/** Why the entry is being asked. Drives the once rule, the badge, and the second look. */
export type Ask = 'first' | 'requeue' | 'second-look';

export type QueueEntry = {
  /** Unique per instance — `${i}`, `${i}:rq`, `${i}:sl` — a React key and the answered ref. */
  readonly key: string;
  readonly position: SeedPosition | {readonly kind: 'second-look-intro'; readonly count: number};
  readonly ask: Ask;
  /** Per-instance shuffled order; a re-queue reshuffles. Absent off answer-bearing entries. */
  readonly options?: readonly SessionOption[];
};

export type SessionState = {
  /** The stop being walked; the ended event's completed-stop record keys on it. */
  readonly stopId: string;
  /** Carried from the seed: the re-queue draws replacements from here. */
  readonly poolByItem: Readonly<Record<string, readonly SeedExercise[]>>;
  /** Only ever grows, so the progress total never shrinks. */
  readonly queue: readonly QueueEntry[];
  /** Only ever increments, so the bar never moves backwards. */
  readonly index: number;
  /**
   * Where the closing run (moment, end) begins. Re-queues clamp before it; the
   * second look splices exactly here and bumps it.
   */
  readonly closingAt: number;
  /** The band being shown, or null. `continue` clears it and advances. */
  readonly answered: {
    readonly key: string;
    readonly verdict: 'correct' | 'wrong' | 'partial';
    readonly answerItemId: string | null;
  } | null;
  /** Misses in the order missed, carrying the ORIGINAL exercise for the second look. */
  readonly misses: readonly {readonly itemId: string; readonly exercise: SeedExercise}[];
  /** Item ids already re-queued once — the once rule. */
  readonly requeued: readonly string[];
  /** Exercise ids whose answer a wrong band revealed; never asked again in this run. */
  readonly revealed: readonly string[];
  /** The total grew for the second look — it does so exactly once. */
  readonly secondLookAdded: boolean;
  /**
   * Consecutive correct commits: up on each correct, back to 0 on a wrong.
   * Session-only — never persisted, never folded into `Progress`. Powers the
   * S7·✓ "n in a row" pill, shown from 3 up.
   */
  readonly run: number;
  /** Item ids missed in the second look — S8's "worth another look". */
  readonly stillMissed: readonly string[];
  /** Card item ids committed; S8's met counts. */
  readonly taught: readonly string[];
  /** Pair-match: item ids cleared on the active board. */
  readonly matched: readonly string[];
  /** Multi-select and build-tray: right picks that filled and stay. */
  readonly filled: readonly string[];
  readonly phase: 'running' | 'ended';
};

/** Whether the entry carries options the learner picks from. */
function answerBearing(position: SeedPosition): boolean {
  return position.kind === 'exercise' && position.exercise.options.length > 0;
}

export function createSession(seed: SessionSeed, rng: Rng): SessionState {
  const queue: QueueEntry[] = seed.positions.map((position, i) => ({
    key: `${i}`,
    position,
    ask: 'first',
    ...(answerBearing(position) && position.kind === 'exercise'
      ? {options: shuffled(rng, position.exercise.options)}
      : {}),
  }));

  const momentAt = seed.positions.findIndex(position => position.kind === 'moment');
  const endAt = seed.positions.findIndex(position => position.kind === 'end');
  const closingAt = momentAt !== -1 ? momentAt : endAt !== -1 ? endAt : seed.positions.length;

  return {
    stopId: seed.stopId,
    poolByItem: seed.poolByItem,
    queue,
    index: 0,
    closingAt,
    answered: null,
    misses: [],
    requeued: [],
    revealed: [],
    // A seed that opts out of the second look reads as already-added, which is
    // the flag commit() checks before splicing — no second code path.
    secondLookAdded: !(seed.secondLook ?? true),
    run: 0,
    stillMissed: [],
    taught: [],
    matched: [],
    filled: [],
    phase: 'running',
  };
}
