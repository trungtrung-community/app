/**
 * @fileoverview The snapshot codec, proven on a real engine state.
 *
 * The states under test come from `createSession` rather than hand-written
 * literals, so the round-trip claim covers whatever fields `SessionState` has
 * this week — the codec must pass them all through, not just the ones it checks.
 */

import {describe, expect, it} from 'vitest';

import {seededRng} from '../engine/rng';
import {createSession, type SessionSeed, type SessionState} from '../engine/session';
import type {AppState} from '../ports/app-state-store';
import {restoreSnapshot, snapshotOf} from './resume-stop';

const SEED: SessionSeed = {
  stopId: 'stop-1',
  positions: [
    {kind: 'card', card: 'word', itemId: 'item-1'},
    {kind: 'end', capabilities: []},
  ],
  poolByItem: {},
  artifacts: [],
};

const EXPECTED = {stopId: 'stop-1', contentVersion: '3'};
const SAVED_AT = '2026-08-19T08:00:00.000Z';

function runningState(): SessionState {
  return createSession(SEED, seededRng(1));
}

/** A parked session whose `state` the codec never wrote — the hostile input. */
function parkedWith(state: unknown): AppState['session'] {
  return {stopId: 'stop-1', contentVersion: '3', savedAt: SAVED_AT, state};
}

describe('restoreSnapshot', () => {
  it('restores an equal state from its own snapshot', () => {
    // Given
    const state = runningState();
    const snapshot = snapshotOf('stop-1', '3', state, SAVED_AT);

    // When
    const restored = restoreSnapshot(snapshot, EXPECTED);

    // Then
    expect(restored).toEqual(state);
  });

  it('returns null when nothing is parked', () => {
    // When
    const restored = restoreSnapshot(null, EXPECTED);

    // Then
    expect(restored).toBeNull();
  });

  it('returns null when the snapshot names a different stop', () => {
    // Given
    const snapshot = snapshotOf('stop-1', '3', runningState(), SAVED_AT);

    // When
    const restored = restoreSnapshot(snapshot, {stopId: 'stop-2', contentVersion: '3'});

    // Then
    expect(restored).toBeNull();
  });

  it('returns null when the content version has moved', () => {
    // Given
    const snapshot = snapshotOf('stop-1', '3', runningState(), SAVED_AT);

    // When
    const restored = restoreSnapshot(snapshot, {stopId: 'stop-1', contentVersion: '4'});

    // Then
    expect(restored).toBeNull();
  });

  it('returns null for every malformed state shape', () => {
    // Given
    const malformed: unknown[] = [
      null,
      'not an object',
      {},
      {...runningState(), queue: 'not an array'},
      {...runningState(), index: -1},
      {...runningState(), index: 99},
      {...runningState(), index: 0.5},
      {...runningState(), phase: 'paused'},
      {...runningState(), stopId: 'stop-2'},
    ];

    // When
    const restored = malformed.map(state => restoreSnapshot(parkedWith(state), EXPECTED));

    // Then
    expect(restored).toEqual(malformed.map(() => null));
  });

  it('restores a valid state carrying fields it does not know', () => {
    // Given — a snapshot from a newer build, with a field this validator predates
    const state = {...runningState(), fieldFromNextWeek: true};

    // When
    const restored = restoreSnapshot(parkedWith(state), EXPECTED);

    // Then
    expect(restored).toEqual(state);
  });
});
