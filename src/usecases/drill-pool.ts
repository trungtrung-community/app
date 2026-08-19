/**
 * @fileoverview The drill machine's pool — docs/03 §4.6: a filter, not a field.
 *
 * A pool names what a practice set may be drawn from: everything, one district,
 * one material type within a district, one stop, or one section. `gatherPool`
 * resolves that name to the exercises and items inside the scope and nothing
 * else — §4.6's firewall is that nothing outside the pool ever enters, because
 * a padded set is the drill quietly teaching another district's material under
 * this district's name.
 *
 * Takes the narrow capabilities rather than `ContentSource`, exactly as
 * `startStop` does, so a test hands in three small doubles rather than the
 * whole port.
 */

import type {Exercise} from '../ports/content-exercise';
import type {SectionId, StopId, Track, VocabId, PhraseId} from '../ports/content-ids';
import type {PhraseItem, Stop, VocabularyItem} from '../ports/content-model';
import type {DictionarySource, ExerciseSource, WalkSource} from '../ports/content-source';

/** One material type, as §4.6's "one material type within a district" names it. */
export type DrillMaterial = 'words' | 'phrases';

/** Which pool a drill draws from. The route carries it via `poolParam`. */
export type DrillPoolRef =
  | {kind: 'everything'}
  | {kind: 'district'; slug: string; material?: DrillMaterial}
  | {kind: 'stop'; stopId: StopId}
  | {kind: 'section'; sectionId: SectionId; track: Track};

/**
 * Everything a pool holds, resolved once.
 *
 * `districtNameByItem` powers Q2's provenance line — "you met it at The
 * Monastery" — so it carries the district's display name, not its slug.
 */
export type DrillPool = {
  readonly exercises: readonly Exercise[];
  readonly itemsById: ReadonlyMap<string, VocabularyItem | PhraseItem>;
  readonly itemKinds: ReadonlyMap<string, 'vocab' | 'phrase'>;
  readonly districtNameByItem: ReadonlyMap<string, string>;
};

/**
 * A pool after selection: the items and exercises one practice run draws on.
 *
 * Defined here because both halves of the machine consume it — the mode
 * registry's fill rules and the session planner that follows.
 */
export type DrillSet = {
  readonly itemIds: readonly string[];
  readonly exercises: readonly Exercise[];
};

export type DrillPoolDeps = {
  readonly walk: WalkSource;
  readonly exercises: ExerciseSource;
  readonly dictionary: DictionarySource;
};

/**
 * Parse a route parameter back into a pool reference.
 *
 * The codec: `everything` · `district:<slug>` · `district:<slug>:words` ·
 * `stop:<id>` · `section:<track>:<id>`. The branded ids are restored here, at
 * the boundary, which is the only place a raw string arrives.
 *
 * @throws when `raw` names no pool.
 */
export function parsePoolParam(raw: string): DrillPoolRef {
  const parts = raw.split(':');
  const [head, second, third] = parts;
  switch (head) {
    case 'everything':
      if (parts.length === 1) {
        return {kind: 'everything'};
      }
      break;
    case 'district':
      if (second !== undefined && second !== '') {
        if (parts.length === 2) {
          return {kind: 'district', slug: second};
        }
        if (parts.length === 3 && (third === 'words' || third === 'phrases')) {
          return {kind: 'district', slug: second, material: third};
        }
      }
      break;
    case 'stop':
      if (parts.length === 2 && second !== undefined && second !== '') {
        return {kind: 'stop', stopId: second as StopId};
      }
      break;
    case 'section':
      if (
        parts.length === 3 &&
        (second === 'speak' || second === 'read') &&
        third !== undefined &&
        third !== ''
      ) {
        return {kind: 'section', sectionId: third as SectionId, track: second};
      }
      break;
    default:
      break;
  }
  throw new Error(`Not a drill pool: ${raw}`);
}

/** Serialise a pool reference for a route. The inverse of `parsePoolParam`. */
export function poolParam(ref: DrillPoolRef): string {
  switch (ref.kind) {
    case 'everything':
      return 'everything';
    case 'district':
      return ref.material === undefined
        ? `district:${ref.slug}`
        : `district:${ref.slug}:${ref.material}`;
    case 'stop':
      return `stop:${ref.stopId}`;
    case 'section':
      return `section:${ref.track}:${ref.sectionId}`;
    default:
      return assertNever(ref);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled member: ${JSON.stringify(value)}`);
}

/** The stops a pool spans. Per-stop queries are fast enough at 430 fixture rows. */
async function stopsFor(walk: WalkSource, ref: DrillPoolRef): Promise<readonly Stop[]> {
  switch (ref.kind) {
    case 'everything': {
      const districts = await walk.listDistricts();
      const perDistrict = await Promise.all(
        districts.map(district => walk.listStopsByDistrict(district.slug)),
      );
      return perDistrict.flat();
    }
    case 'district':
      return walk.listStopsByDistrict(ref.slug);
    case 'stop':
      return [await walk.getStop(ref.stopId)];
    case 'section':
      return walk.listStopsBySection(ref.sectionId);
    default:
      return assertNever(ref);
  }
}

/**
 * Which material an exercise drills.
 *
 * A pair-match board carries no single target — it runs over the stop's words
 * (docs/03 §1), so it belongs to the words material. Null means the exercise
 * drills neither material and is excluded from a material-scoped pool.
 */
function materialOf(exercise: Exercise): DrillMaterial | null {
  if (exercise.target?.kind === 'vocab') {
    return 'words';
  }
  if (exercise.target?.kind === 'phrase') {
    return 'phrases';
  }
  return exercise.type === 'pair-match' ? 'words' : null;
}

/**
 * Resolve a pool reference to its exercises and items.
 *
 * Speak drills only for now: vocab and phrase targets resolve to records, and
 * every other target kind (letter, stack, syllable, word, mark) is skipped —
 * the Read track's drill surfaces are the follow-up that widens this.
 */
export async function gatherPool(deps: DrillPoolDeps, ref: DrillPoolRef): Promise<DrillPool> {
  const stops = await stopsFor(deps.walk, ref);
  const material = ref.kind === 'district' ? (ref.material ?? null) : null;
  const perStop = await Promise.all(
    stops.map(async stop => ({stop, list: await deps.exercises.listExercisesByStop(stop.id)})),
  );

  const exercises: Exercise[] = [];
  const itemKinds = new Map<string, 'vocab' | 'phrase'>();
  const districtSlugByItem = new Map<string, string>();
  for (const {stop, list} of perStop) {
    for (const exercise of list) {
      if (material !== null && materialOf(exercise) !== material) {
        continue;
      }
      exercises.push(exercise);
      const target = exercise.target;
      if (target === null || (target.kind !== 'vocab' && target.kind !== 'phrase')) {
        continue;
      }
      itemKinds.set(target.id, target.kind);
      if (stop.district !== null && !districtSlugByItem.has(target.id)) {
        districtSlugByItem.set(target.id, stop.district);
      }
    }
  }

  const entries = await Promise.all(
    [...itemKinds].map(async ([itemId, kind]): Promise<[string, VocabularyItem | PhraseItem]> => {
      const record =
        kind === 'vocab'
          ? await deps.dictionary.getVocabulary(itemId as VocabId)
          : await deps.dictionary.getPhrase(itemId as PhraseId);
      return [itemId, record];
    }),
  );

  const slugs = [...new Set(districtSlugByItem.values())];
  const districts = await Promise.all(slugs.map(slug => deps.walk.getDistrict(slug)));
  const nameBySlug = new Map(districts.map(district => [district.slug, district.name]));
  const districtNameByItem = new Map<string, string>();
  for (const [itemId, slug] of districtSlugByItem) {
    const name = nameBySlug.get(slug);
    if (name !== undefined) {
      districtNameByItem.set(itemId, name);
    }
  }

  return {exercises, itemsById: new Map(entries), itemKinds, districtNameByItem};
}
