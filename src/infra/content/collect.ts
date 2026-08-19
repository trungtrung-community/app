/**
 * @fileoverview Turning flat row lists into the lookups the adapters assemble from.
 *
 * Both adapters build the same nested values out of separate tables — a phrase and
 * its chunks, an exercise and its options, a collection and its cards. One fetches
 * the child rows with a query and the other reads them out of the fixture, and from
 * there the grouping is identical. Sharing it is what keeps the two from drifting on
 * something as easy to get subtly wrong as an empty group.
 */

/**
 * Every row grouped under the key it belongs to, in the order given.
 *
 * @returns A map with no entry for a key nothing carries. Callers read a missing
 * group as the empty list, which is what a phrase with no chunks actually is.
 */
export function groupBy<T, K>(rows: readonly T[], keyOf: (row: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }
  return groups;
}

/** One row per key. The last row wins, which only matters if the key is not unique. */
export function indexBy<T, K>(rows: readonly T[], keyOf: (row: T) => K): Map<K, T> {
  return new Map(rows.map(row => [keyOf(row), row]));
}
