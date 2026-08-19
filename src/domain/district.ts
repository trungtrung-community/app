/**
 * @fileoverview The walk's ordering over districts.
 *
 * District numbering can hold gaps — a district may be written before its
 * neighbours — so "the district before this one" is decided against the listed
 * districts, never by subtracting one from the number.
 */

/** The least a district needs to be ordered on the walk. */
type Numbered = {readonly number: number};

/**
 * The listed district the given number follows: the one with the highest
 * number strictly below it, or null when nothing is listed below.
 */
export function previousDistrict<T extends Numbered>(
  districts: readonly T[],
  number: number,
): T | null {
  let previous: T | null = null;
  for (const candidate of districts) {
    if (candidate.number < number && (previous === null || candidate.number > previous.number)) {
      previous = candidate;
    }
  }
  return previous;
}
