/**
 * @fileoverview The snapshot codec: a running session into the app-state store,
 * and back.
 *
 * The port keeps `session.state` opaque because ports import only domain. This
 * use case is where the engine's `SessionState` is allowed to appear, so encoding
 * and validation live here, on either side of that seam.
 *
 * Restoring is deliberately strict. A snapshot is only honoured when it names the
 * stop being entered, was cut against the same content version, and still has the
 * structure the engine needs. Anything else is discarded, and a discarded
 * snapshot means the stop re-enters from the start — under the S4·r framing, the
 * honest fallback: better to walk the stop again than to run the engine on a
 * state it never produced.
 *
 * Validation is structural and tolerant of extra fields. `SessionState` is
 * growing this week, and a validator that enumerated known fields would discard
 * every snapshot written by a newer build. It checks what the engine needs —
 * the queue is an array, the index is within bounds, the phase is known — and
 * passes the rest through untouched.
 *
 * Wiring into `useStopSession` happens in a later task, once the concurrent
 * engine work lands. Nothing calls this yet.
 */

import type {SessionState} from '../engine/session';
import type {AppState} from '../ports/app-state-store';

/**
 * Encode a running session for `AppState.session`.
 *
 * @param savedAt When the snapshot is taken, as an ISO timestamp. Injected
 *   rather than read from a clock, so the caller and its tests own time.
 */
export function snapshotOf(
  stopId: string,
  contentVersion: string,
  state: SessionState,
  savedAt: string,
): AppState['session'] {
  return {stopId, contentVersion, savedAt, state};
}

/**
 * Decode a stored snapshot back into a `SessionState`, or refuse it.
 *
 * @returns The state to resume, or null when there is nothing parked, the
 *   snapshot names a different stop, the content version has moved, or the state
 *   no longer has the structure the engine needs. Null means the stop re-enters
 *   from the start.
 */
export function restoreSnapshot(
  raw: AppState['session'],
  expected: {stopId: string; contentVersion: string},
): SessionState | null {
  if (raw === null) {
    return null;
  }
  if (raw.stopId !== expected.stopId || raw.contentVersion !== expected.contentVersion) {
    return null;
  }
  if (!isRestorable(raw.state)) {
    return null;
  }
  // The engine keys the ended event's completed-stop record on the state's own
  // stopId, so a snapshot whose inner state disagrees with its envelope is
  // corrupt even though both halves parsed.
  if (raw.state.stopId !== raw.stopId) {
    return null;
  }
  return raw.state;
}

/**
 * Whether a stored value still has the structure the engine needs to run.
 *
 * Structural, not exhaustive: unknown extra fields pass through, per the
 * fileoverview. The checks mirror the engine's own invariants — the queue is the
 * array it walks, the index points into it, and the phase is one it knows.
 */
function isRestorable(value: unknown): value is SessionState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const state = value as {
    readonly stopId?: unknown;
    readonly queue?: unknown;
    readonly index?: unknown;
    readonly phase?: unknown;
  };
  if (typeof state.stopId !== 'string') {
    return false;
  }
  if (!Array.isArray(state.queue)) {
    return false;
  }
  if (typeof state.index !== 'number' || !Number.isInteger(state.index)) {
    return false;
  }
  if (state.index < 0 || state.index >= state.queue.length) {
    return false;
  }
  return state.phase === 'running' || state.phase === 'ended';
}
