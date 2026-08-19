/**
 * @fileoverview The self-rated flashcard deck — docs/03 §7's two buttons.
 *
 * Again and Got it are the whole interface, and the rating is the scheduler.
 * What this deck owns is the in-session pile: Again sends the current card to
 * the back of the pile, Got it retires it, and the deck ends when the pile
 * does. A deck created from nothing is born already ended.
 *
 * Two structural guarantees carry the counter: the queue only grows, so the
 * total never shrinks; the index only increments, so the counter never moves
 * backwards. The `n of m` the UI shows is index+1 of total — like the stop
 * bar, m grows when Again re-queues.
 *
 * Ids here are plain strings, treated as opaque. Brands are restored at the
 * use-case boundary.
 */

import {shuffled, type Rng} from './rng';

export type FlashDeckCard = {
  readonly itemId: string;
};

export type FlashDeckState = {
  /** Only ever grows, so the counter's total never shrinks. */
  readonly queue: readonly FlashDeckCard[];
  /** Only ever increments, so the counter never moves backwards. */
  readonly index: number;
  /** The counter's m; each Again grows it by exactly one. */
  readonly total: number;
  /** Item ids already rated Again this session — the firstTime flag's memory. */
  readonly ratedAgain: readonly string[];
  readonly phase: 'running' | 'ended';
};

/** The two buttons of docs/03 §7. */
export type FlashRating = 'again' | 'got-it';

export type FlashEvent =
  | {readonly kind: 'again'; readonly itemId: string; readonly firstTime: boolean}
  | {readonly kind: 'correct'; readonly itemId: string}
  | {readonly kind: 'ended'};

export type FlashOutcome = {
  readonly state: FlashDeckState;
  readonly events: readonly FlashEvent[];
};

const UNCHANGED = (state: FlashDeckState): FlashOutcome => ({state, events: []});

/** Deals the deck in a seeded shuffle. An empty input is born already ended. */
export function createDeck(cards: readonly FlashDeckCard[], rng: Rng): FlashDeckState {
  return {
    queue: shuffled(rng, cards),
    index: 0,
    total: cards.length,
    ratedAgain: [],
    phase: cards.length === 0 ? 'ended' : 'running',
  };
}

/**
 * Rate the current card and advance. Again re-inserts the card at the back and
 * grows the total; `firstTime` is true only the first time this itemId is
 * rated Again this session. Got it emits `correct` and moves on. Advancing
 * past the last card ends the deck with an `ended` event; rating an ended deck
 * returns the state unchanged with no events.
 */
export function rate(state: FlashDeckState, rating: FlashRating): FlashOutcome {
  if (state.phase === 'ended') {
    return UNCHANGED(state);
  }
  const card = state.queue[state.index];
  if (card === undefined) {
    return UNCHANGED(state);
  }
  if (rating === 'again') {
    const firstTime = !state.ratedAgain.includes(card.itemId);
    const next: FlashDeckState = {
      ...state,
      queue: [...state.queue, card],
      total: state.total + 1,
      ratedAgain: firstTime ? [...state.ratedAgain, card.itemId] : state.ratedAgain,
    };
    return advance(next, [{kind: 'again', itemId: card.itemId, firstTime}]);
  }
  return advance(state, [{kind: 'correct', itemId: card.itemId}]);
}

/**
 * Step forward one card. Only Got it on the last card can arrive here at the
 * queue's end — Again just grew the queue past the incremented index — so this
 * is the one place the deck ends.
 */
function advance(state: FlashDeckState, events: readonly FlashEvent[]): FlashOutcome {
  const index = state.index + 1;
  if (index === state.queue.length) {
    return {state: {...state, index, phase: 'ended'}, events: [...events, {kind: 'ended'}]};
  }
  return {state: {...state, index}, events};
}
