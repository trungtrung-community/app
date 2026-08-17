/**
 * @fileoverview Calendar arithmetic on plain `YYYY-MM-DD` days.
 *
 * The learning rules are stated in days, not instants: an item becomes known on
 * "two different days", intervals are counts of days, and a walked day is a
 * calendar day. Modelling that as a timestamp invites timezone bugs where a
 * learner in Kathmandu and one in Zurich disagree about which day it is.
 *
 * `Date` appears here for arithmetic only, always in UTC, and never to read the
 * clock. Nothing in src/domain may call `Date.now()` — the current day arrives as
 * an argument, which is what makes the progression rules testable without fake
 * timers.
 */

/** A calendar day as `YYYY-MM-DD`. */
export type IsoDate = string & {readonly __brand: 'IsoDate'};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

/**
 * Narrow a string to an IsoDate, throwing when it is not one.
 *
 * @throws If the string is not exactly `YYYY-MM-DD`.
 */
export function isoDate(value: string): IsoDate {
  if (!ISO_DATE.test(value)) {
    throw new Error(`not a YYYY-MM-DD date: ${value}`);
  }
  return value as IsoDate;
}

/** The calendar day of an instant, in UTC. The only place a clock may enter. */
export function toIsoDate(instant: Date): IsoDate {
  return instant.toISOString().slice(0, 10) as IsoDate;
}

/** Whole days from `from` to `to`. Negative when `to` is earlier. */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((epoch(to) - epoch(from)) / MS_PER_DAY);
}

/** The day `days` after `from`. Accepts a negative `days` to go back. */
export function addDays(from: IsoDate, days: number): IsoDate {
  return new Date(epoch(from) + days * MS_PER_DAY).toISOString().slice(0, 10) as IsoDate;
}

/** The later of two days. */
export function maxDate(a: IsoDate, b: IsoDate): IsoDate {
  return a >= b ? a : b;
}

function epoch(date: IsoDate): number {
  // Parsed as UTC midnight, so the difference between two days is always a whole
  // number of days regardless of where the learner is.
  return Date.parse(`${date}T00:00:00.000Z`);
}
