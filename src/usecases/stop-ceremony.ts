/**
 * @fileoverview What a finished stop has earned beyond its own end beats.
 *
 * The stop's own ending — S12, S8, the cards — belongs to the session. This use
 * case answers the question that comes after: did that stop close a circuit of
 * its district (S9), finish the first walk (J3 → J4), or finish both walks
 * (F-A)? One `Ceremony` value, largest first, so a caller never shows two
 * ceremonies for one stop.
 *
 * Speak-only by definition. The three ceremonies are moments on the Speak map,
 * and a Read stop — no district, no circuit — never triggers one.
 *
 * Takes the narrow `WalkSource` rather than `ContentSource`, exactly as the
 * sibling use cases do, so a test hands in one small double.
 */

import type {Stop} from '../ports/content-model';
import type {WalkSource} from '../ports/content-source';
import type {Progress} from '../ports/progress-store';

/**
 * The moment a finished stop has earned, if any.
 *
 * `district-finished` is walk-scoped: `circuit` says which loop closed, and the
 * S9 screen keeps the first-walk variant from ever saying "complete".
 */
export type Ceremony =
  | {kind: 'none'}
  | {kind: 'district-finished'; slug: string; circuit: number}
  | {kind: 'first-walk-complete'}
  | {kind: 'both-walks-complete'};

export type StopCeremonyDeps = {
  readonly walk: WalkSource;
};

/**
 * Decide which ceremony, if any, follows the stop that just completed.
 *
 * Precedence is both-walks > first-walk > district: finishing the last stop of
 * the last district necessarily finishes that district too, and the larger
 * moment is the one that runs.
 *
 * @param progress The snapshot that already includes the finished stop.
 * @param stop The stop that just completed.
 */
export async function afterStop(
  deps: StopCeremonyDeps,
  progress: Progress,
  stop: Stop,
): Promise<Ceremony> {
  if (stop.track !== 'speak' || stop.district === null || stop.circuit === null) {
    return {kind: 'none'};
  }

  const districts = await deps.walk.listDistricts();
  const perDistrict = await Promise.all(
    districts.map(district => deps.walk.listStopsByDistrict(district.slug)),
  );
  const allStops = perDistrict.flat();

  // Membership as `selectStopDone` tests it: the id list, nothing derived.
  const done = (stopId: string) => progress.completedStops.includes(stopId);

  if (allStops.every(candidate => done(candidate.id))) {
    return {kind: 'both-walks-complete'};
  }
  const firstWalk = allStops.filter(candidate => candidate.circuit === 1);
  if (firstWalk.every(candidate => done(candidate.id))) {
    return {kind: 'first-walk-complete'};
  }
  const circuitStops = allStops.filter(
    candidate => candidate.district === stop.district && candidate.circuit === stop.circuit,
  );
  if (circuitStops.every(candidate => done(candidate.id))) {
    return {kind: 'district-finished', slug: stop.district, circuit: stop.circuit};
  }
  return {kind: 'none'};
}
