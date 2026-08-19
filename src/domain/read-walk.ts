/**
 * @fileoverview The Read walk's order, and its one unlock rule.
 *
 * Read has no districts: the track is one strictly linear sequence of stops,
 * walked section by section (docs/03 §4.2). A stop opens when the stop before it
 * is done — the same no-skipping rule the district hub applies within a
 * district, lifted to the whole track.
 *
 * Structural types rather than the content model, like `previousDistrict`: the
 * rule needs an order and a done-ness, and nothing else.
 */

/** The least a section needs to place its stops on the walk. */
type OrderedSection<K extends string> = {readonly id: K; readonly number: number};

/** The least a stop needs to be ordered and opened. */
type OrderedStop = {readonly id: string; readonly ordinal: number};

/**
 * Every Read stop in walking order: sections by number, stops by ordinal.
 *
 * Sections with no stops contribute nothing, so a fixture carrying only part of
 * the track still yields one continuous sequence.
 */
export function orderReadStops<K extends string, T extends OrderedStop>(
  sections: readonly OrderedSection<K>[],
  stopsBySection: ReadonlyMap<K, readonly T[]>,
): readonly T[] {
  return [...sections]
    .sort((a, b) => a.number - b.number)
    .flatMap(section =>
      [...(stopsBySection.get(section.id) ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    );
}

/**
 * The stops a learner may open: every done stop (a walk can be repeated), plus
 * the first undone one.
 *
 * A done stop is walkable by definition, which is also the restored-backup
 * guard: progress a learner carries always opens the ground it was made on.
 */
export function walkableReadStopIds(
  ordered: readonly OrderedStop[],
  isDone: (stopId: string) => boolean,
): ReadonlySet<string> {
  const walkable = new Set<string>();
  for (const stop of ordered) {
    walkable.add(stop.id);
    if (!isDone(stop.id)) {
      break;
    }
  }
  return walkable;
}
