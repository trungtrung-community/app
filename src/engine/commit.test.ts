/**
 * @fileoverview commit() — the answer state machine of docs/03 §2 and the second
 * look of §4.4, asserted with scripted rngs so every gap and order is exact.
 * Phases per `docs/11-testing-conventions.md`.
 */

import {describe, expect, it} from 'vitest';

import {commit, type CommitInput} from './commit';
import {seededRng, type Rng} from './rng';
import {
  createSession,
  type SeedExercise,
  type SeedPosition,
  type SessionSeed,
  type SessionState,
} from './session';

/** rng drawing 0 forever: intBetween picks the floor, shuffles rotate left. */
const LOW: Rng = () => 0;
/** rng drawing just under 1: intBetween picks the ceiling. */
const HIGH: Rng = () => 0.999999;

function exercise(id: string, item: string, overrides: Partial<SeedExercise> = {}): SeedExercise {
  return {
    exerciseId: id,
    itemId: item,
    exerciseType: 'meaning-pick',
    presentation: 'meaning-pick',
    commitMode: 'tap',
    options: [
      {itemId: item, isAnswer: true},
      {itemId: 'vocab.other-1', isAnswer: false},
      {itemId: 'vocab.other-2', isAnswer: false},
    ],
    ...overrides,
  };
}

const MOMENT: SeedPosition = {kind: 'moment'};
const END: SeedPosition = {kind: 'end', capabilities: ['Greet someone']};

function ex(e: SeedExercise): SeedPosition {
  return {kind: 'exercise', exercise: e};
}

/**
 * A stop with enough runway that a +3..5 re-queue lands before the closing
 * boundary: exercise on 'vocab.cha', five filler cards, moment, end.
 */
function runwaySeed(pool: readonly SeedExercise[] = []): SessionSeed {
  const fillers: SeedPosition[] = Array.from({length: 5}, (unused, i) => ({
    kind: 'card',
    card: 'word',
    itemId: `vocab.filler-${i}`,
  }));
  return {
    stopId: 'stop.test',
    positions: [ex(exercise('ex.1', 'vocab.cha')), ...fillers, MOMENT, END],
    poolByItem: {'vocab.cha': [exercise('ex.1', 'vocab.cha'), ...pool]},
  };
}

/** Taps the stored answer of the entry at the state's index. */
function tapAnswer(state: SessionState): CommitInput {
  const options = state.queue[state.index]?.options ?? [];
  const answer = options.find(option => option.isAnswer);
  return {kind: 'tap', itemId: answer?.itemId ?? ''};
}

/** Taps a wrong option of the entry at the state's index. */
function tapWrong(state: SessionState): CommitInput {
  const options = state.queue[state.index]?.options ?? [];
  const wrong = options.find(option => !option.isAnswer);
  return {kind: 'tap', itemId: wrong?.itemId ?? ''};
}

describe('tap', () => {
  it('commits a correct tap: teal band, correct event, no advance yet', () => {
    // Given
    const state = createSession(runwaySeed(), seededRng(1));

    // When
    const outcome = commit(state, tapAnswer(state), seededRng(1));

    // Then
    expect(outcome.state.answered?.verdict).toBe('correct');
    expect(outcome.state.index).toBe(0);
    expect(outcome.events).toEqual([{kind: 'correct', itemId: 'vocab.cha'}]);
  });

  it('commits a wrong tap: wrong band, the answer revealed, the miss recorded', () => {
    // Given
    const alt = exercise('ex.alt', 'vocab.cha', {exerciseType: 'listen-pick'});
    const state = createSession(runwaySeed([alt]), seededRng(1));

    // When
    const outcome = commit(state, tapWrong(state), LOW);

    // Then
    expect(outcome.state.answered?.verdict).toBe('wrong');
    expect(outcome.state.answered?.answerItemId).toBe('vocab.cha');
    expect(outcome.state.revealed).toContain('ex.1');
    expect(outcome.state.misses).toEqual([
      {itemId: 'vocab.cha', exercise: expect.objectContaining({exerciseId: 'ex.1'})},
    ]);
  });

  it('re-queues a different record three positions later at the low draw', () => {
    // Given
    const alt = exercise('ex.alt', 'vocab.cha', {exerciseType: 'listen-pick'});
    const state = createSession(runwaySeed([alt]), seededRng(1));

    // When
    const outcome = commit(state, tapWrong(state), LOW);

    // Then — total grew by one, the entry sits at index+3, carrying the alternative
    expect(outcome.state.queue.length).toBe(state.queue.length + 1);
    const entry = outcome.state.queue[3];
    expect(entry?.ask).toBe('requeue');
    expect(entry?.position).toEqual({
      kind: 'exercise',
      exercise: expect.objectContaining({exerciseId: 'ex.alt'}),
    });
    expect(outcome.events).toContainEqual({kind: 'requeued', itemId: 'vocab.cha', at: 3});
    expect(outcome.state.closingAt).toBe(state.closingAt + 1);
  });

  it('re-queues five positions later at the high draw', () => {
    // Given
    const alt = exercise('ex.alt', 'vocab.cha', {exerciseType: 'listen-pick'});
    const state = createSession(runwaySeed([alt]), seededRng(1));

    // When
    const outcome = commit(state, tapWrong(state), HIGH);

    // Then
    expect(outcome.state.queue[5]?.ask).toBe('requeue');
  });

  it('clamps the re-queue to the closing boundary', () => {
    // Given — no runway: exercise, one card, moment, end
    const alt = exercise('ex.alt', 'vocab.cha', {exerciseType: 'listen-pick'});
    const seed: SessionSeed = {
      stopId: 'stop.test',
      positions: [
        ex(exercise('ex.1', 'vocab.cha')),
        {kind: 'card', card: 'word', itemId: 'vocab.f'},
        MOMENT,
        END,
      ],
      poolByItem: {'vocab.cha': [exercise('ex.1', 'vocab.cha'), alt]},
    };
    const state = createSession(seed, seededRng(1));

    // When
    const outcome = commit(state, tapWrong(state), HIGH);

    // Then — the moment sat at 2; the re-queue lands there, before the closing run
    expect(outcome.state.queue[2]?.ask).toBe('requeue');
    expect(outcome.state.queue[3]?.position.kind).toBe('moment');
  });

  it('never re-queues twice: a miss on the re-queued entry only waits for the second look', () => {
    // Given — walk to the re-queued entry and miss it too
    const alt = exercise('ex.alt', 'vocab.cha', {exerciseType: 'listen-pick'});
    let state = createSession(runwaySeed([alt]), seededRng(1));
    state = commit(state, tapWrong(state), LOW).state;
    state = commit(state, {kind: 'continue'}, LOW).state; // clear the band
    state = commit(state, {kind: 'continue'}, LOW).state; // card
    state = commit(state, {kind: 'continue'}, LOW).state; // card — now at the requeue
    expect(state.queue[state.index]?.ask).toBe('requeue');
    const before = state.queue.length;

    // When
    const outcome = commit(state, tapWrong(state), LOW);

    // Then
    expect(outcome.state.queue.length).toBe(before);
    expect(outcome.state.misses.length).toBe(1);
  });

  it('skips the re-queue when every alternative is revealed', () => {
    // Given — the pool holds only the record being missed
    const state = createSession(runwaySeed(), seededRng(1));
    const before = state.queue.length;

    // When
    const outcome = commit(state, tapWrong(state), LOW);

    // Then — no insert; the miss waits for the second look
    expect(outcome.state.queue.length).toBe(before);
    expect(outcome.state.misses.length).toBe(1);
  });

  it('prefers a type the item has not seen', () => {
    // Given — two alternatives: one same-type, one unseen-type
    const same = exercise('ex.same', 'vocab.cha');
    const unseen = exercise('ex.unseen', 'vocab.cha', {exerciseType: 'listen-pick'});
    const state = createSession(runwaySeed([same, unseen]), seededRng(1));

    // When
    const outcome = commit(state, tapWrong(state), LOW);

    // Then
    const entry = outcome.state.queue[3];
    expect(entry?.position).toEqual({
      kind: 'exercise',
      exercise: expect.objectContaining({exerciseId: 'ex.unseen'}),
    });
  });
});

describe('continue', () => {
  it('clears the band and advances', () => {
    // Given
    let state = createSession(runwaySeed(), seededRng(1));
    state = commit(state, tapAnswer(state), LOW).state;

    // When
    const outcome = commit(state, {kind: 'continue'}, LOW);

    // Then
    expect(outcome.state.answered).toBeNull();
    expect(outcome.state.index).toBe(1);
  });

  it('teaches from a card', () => {
    // Given — advance past the answered exercise to the first card
    let state = createSession(runwaySeed(), seededRng(1));
    state = commit(state, tapAnswer(state), LOW).state;
    state = commit(state, {kind: 'continue'}, LOW).state;

    // When
    const outcome = commit(state, {kind: 'continue'}, LOW);

    // Then
    expect(outcome.events).toEqual([{kind: 'taught', itemId: 'vocab.filler-0'}]);
    expect(outcome.state.taught).toContain('vocab.filler-0');
  });
});

describe('the second look', () => {
  /** Miss the first exercise, then continue to the closing boundary. */
  function walkToClosing(pool: readonly SeedExercise[]): {
    state: SessionState;
    spliceEvents: readonly unknown[];
  } {
    let state = createSession(runwaySeed(pool), seededRng(1));
    state = commit(state, tapWrong(state), LOW).state;
    let events: readonly unknown[] = [];
    while (state.index < state.closingAt - 1) {
      state = commit(state, {kind: 'continue'}, LOW).state;
    }
    // The next continue arrives at the boundary.
    const outcome = commit(state, {kind: 'continue'}, LOW);
    state = outcome.state;
    events = outcome.events;
    return {state, spliceEvents: events};
  }

  it('splices the round at the boundary: intro first, then every miss in order', () => {
    // When
    const {state, spliceEvents} = walkToClosing([]);

    // Then
    const intro = state.queue[state.index];
    expect(intro?.position).toEqual({kind: 'second-look-intro', count: 1});
    const retry = state.queue[state.index + 1];
    expect(retry?.ask).toBe('second-look');
    expect(retry?.position).toEqual({
      kind: 'exercise',
      exercise: expect.objectContaining({exerciseId: 'ex.1'}),
    });
    expect(spliceEvents).toContainEqual({kind: 'second-look-added', count: 1});
    expect(state.secondLookAdded).toBe(true);
  });

  it('returns a miss even when its re-queue was answered correctly', () => {
    // Given — miss ex.1, recover on the re-queued alternative
    const alt = exercise('ex.alt', 'vocab.cha', {exerciseType: 'listen-pick'});
    let state = createSession(runwaySeed([alt]), seededRng(1));
    state = commit(state, tapWrong(state), LOW).state;
    state = commit(state, {kind: 'continue'}, LOW).state;
    state = commit(state, {kind: 'continue'}, LOW).state;
    state = commit(state, {kind: 'continue'}, LOW).state;
    state = commit(state, tapAnswer(state), LOW).state; // recover at the requeue
    state = commit(state, {kind: 'continue'}, LOW).state;
    while (state.index < state.closingAt - 1) {
      state = commit(state, {kind: 'continue'}, LOW).state;
    }

    // When
    const outcome = commit(state, {kind: 'continue'}, LOW);

    // Then — §4.4 literal: every miss returns
    expect(outcome.state.queue[outcome.state.index]?.position).toEqual({
      kind: 'second-look-intro',
      count: 1,
    });
  });

  it('skips entirely when nothing was missed', () => {
    // Given — answer everything correctly up to the boundary
    let state = createSession(runwaySeed(), seededRng(1));
    state = commit(state, tapAnswer(state), LOW).state;
    const total = state.queue.length;
    while (state.index < state.closingAt) {
      state = commit(state, {kind: 'continue'}, LOW).state;
    }

    // Then
    expect(state.queue.length).toBe(total);
    expect(state.queue[state.index]?.position.kind).toBe('moment');
  });

  it('sends a second-look miss to the summary list, never back into the queue', () => {
    // Given — arrive at the second-look retry
    let {state} = walkToClosing([]);
    state = commit(state, {kind: 'continue'}, LOW).state; // past the sl intro
    expect(state.queue[state.index]?.ask).toBe('second-look');
    const total = state.queue.length;

    // When
    let outcome = commit(state, tapWrong(state), LOW);

    // Then
    expect(outcome.state.stillMissed).toEqual(['vocab.cha']);
    expect(outcome.state.queue.length).toBe(total);
  });
});

describe('finish', () => {
  it('ends the session with counts, capabilities and the worth-another-look list', () => {
    // Given — a full run with one unrecovered miss
    let state = createSession(runwaySeed([]), seededRng(1));
    state = commit(state, tapWrong(state), LOW).state;
    while (state.phase === 'running' && state.index < state.queue.length - 1) {
      const entry = state.queue[state.index];
      const input: CommitInput =
        entry?.position.kind === 'exercise' && state.answered === null
          ? tapWrong(state)
          : {kind: 'continue'};
      state = commit(state, input, LOW).state;
    }

    // When
    const outcome = commit(state, {kind: 'finish'}, LOW);

    // Then
    expect(outcome.state.phase).toBe('ended');
    expect(outcome.events).toEqual([
      {
        kind: 'ended',
        summary: {
          capabilities: ['Greet someone'],
          taughtItemIds: state.taught,
          worthAnotherLook: ['vocab.cha'],
        },
      },
    ]);
  });

  it('does nothing anywhere but the end', () => {
    // Given
    const state = createSession(runwaySeed(), seededRng(1));

    // When
    const outcome = commit(state, {kind: 'finish'}, LOW);

    // Then
    expect(outcome.state).toBe(state);
    expect(outcome.events).toEqual([]);
  });
});

describe('the bar', () => {
  it('never moves backwards and its total never shrinks across a messy run', () => {
    // Given
    const alt = exercise('ex.alt', 'vocab.cha', {exerciseType: 'listen-pick'});
    let state = createSession(runwaySeed([alt]), seededRng(1));
    const indexes: number[] = [state.index];
    const totals: number[] = [state.queue.length];

    // When — a run with a miss, a recovery, and the second look
    const script: CommitInput[] = [tapWrong(state), {kind: 'continue'}];
    for (const input of script) {
      state = commit(state, input, LOW).state;
      indexes.push(state.index);
      totals.push(state.queue.length);
    }
    while (state.phase === 'running' && state.index < state.queue.length - 1) {
      const entry = state.queue[state.index];
      const input: CommitInput =
        entry?.position.kind === 'exercise' && state.answered === null
          ? tapAnswer(state)
          : {kind: 'continue'};
      state = commit(state, input, LOW).state;
      indexes.push(state.index);
      totals.push(state.queue.length);
    }

    // Then
    expect(indexes.every((v, i) => i === 0 || v >= (indexes[i - 1] ?? 0))).toBe(true);
    expect(totals.every((v, i) => i === 0 || v >= (totals[i - 1] ?? 0))).toBe(true);
  });
});

describe('pair', () => {
  function pairSeed(): SessionSeed {
    const board = exercise('ex.pairs', 'vocab.cha', {
      commitMode: 'pairs',
      options: [
        {itemId: 'vocab.a', isAnswer: false},
        {itemId: 'vocab.b', isAnswer: false},
      ],
    });
    return {stopId: 'stop.test', positions: [ex(board), END], poolByItem: {}};
  }

  it('accumulates a matched pair while the board is uncleared', () => {
    // Given
    const state = createSession(pairSeed(), seededRng(1));

    // When
    const outcome = commit(state, {kind: 'pair', a: 'vocab.a', b: 'vocab.a'}, LOW);

    // Then
    expect(outcome.state.matched).toEqual(['vocab.a']);
    expect(outcome.state.index).toBe(0);
    expect(outcome.state.answered).toBeNull();
  });

  it('advances off a cleared board with the correct event and no band', () => {
    // Given
    let state = createSession(pairSeed(), seededRng(1));
    state = commit(state, {kind: 'pair', a: 'vocab.a', b: 'vocab.a'}, LOW).state;

    // When
    const outcome = commit(state, {kind: 'pair', a: 'vocab.b', b: 'vocab.b'}, LOW);

    // Then
    expect(outcome.state.index).toBe(1);
    expect(outcome.state.answered).toBeNull();
    expect(outcome.events).toContainEqual({kind: 'correct', itemId: 'vocab.cha'});
  });

  it('starts the next board clean when two boards share a tile', () => {
    // Given — two boards in one seed, both holding 'vocab.shared'
    const board = (id: string, tiles: readonly string[]): SeedExercise =>
      exercise(id, 'vocab.cha', {
        commitMode: 'pairs',
        options: tiles.map(tile => ({itemId: tile, isAnswer: false})),
      });
    const seed: SessionSeed = {
      stopId: 'stop.test',
      positions: [
        ex(board('ex.b1', ['vocab.a', 'vocab.shared'])),
        ex(board('ex.b2', ['vocab.shared', 'vocab.c'])),
        END,
      ],
      poolByItem: {},
    };
    let state = createSession(seed, seededRng(1));
    state = commit(state, {kind: 'pair', a: 'vocab.a', b: 'vocab.a'}, LOW).state;
    state = commit(state, {kind: 'pair', a: 'vocab.shared', b: 'vocab.shared'}, LOW).state;

    // When — board 1 cleared and advanced; the shared tile matches again on board 2
    const outcome = commit(state, {kind: 'pair', a: 'vocab.shared', b: 'vocab.shared'}, LOW);

    // Then
    expect(state.index).toBe(1);
    expect(state.matched).toEqual([]);
    expect(outcome.state.matched).toEqual(['vocab.shared']);
  });

  it('leaves a wrong pair alone: no state change, no miss', () => {
    // Given
    const state = createSession(pairSeed(), seededRng(1));

    // When
    const outcome = commit(state, {kind: 'pair', a: 'vocab.a', b: 'vocab.b'}, LOW);

    // Then
    expect(outcome.state).toBe(state);
    expect(outcome.events).toEqual([]);
  });
});

describe('check', () => {
  function checkSeed(): SessionSeed {
    const multi = exercise('ex.multi', 'vocab.cha', {
      commitMode: 'check',
      options: [
        {itemId: 'vocab.a', isAnswer: true},
        {itemId: 'vocab.b', isAnswer: true},
        {itemId: 'vocab.c', isAnswer: false},
      ],
    });
    return {stopId: 'stop.test', positions: [ex(multi), END], poolByItem: {}};
  }

  it('commits correct when every answer is picked and nothing else', () => {
    // Given
    const state = createSession(checkSeed(), seededRng(1));

    // When
    const outcome = commit(state, {kind: 'check', picked: ['vocab.a', 'vocab.b']}, LOW);

    // Then
    expect(outcome.state.answered?.verdict).toBe('correct');
  });

  it('keeps right picks and stays active on a partial check', () => {
    // Given
    const state = createSession(checkSeed(), seededRng(1));

    // When
    const outcome = commit(state, {kind: 'check', picked: ['vocab.a', 'vocab.c']}, LOW);

    // Then
    expect(outcome.state.filled).toEqual(['vocab.a']);
    expect(outcome.state.answered).toBeNull();
    expect(outcome.state.index).toBe(0);
  });
});
