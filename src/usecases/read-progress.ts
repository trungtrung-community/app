/**
 * @fileoverview The crossing's inputs, derived from progress — never stored.
 *
 * `docs/07` O9 (option B) makes readable a function of two sets: the letters the
 * learner has met, and the rules the completed Read stops have taught. This use
 * case assembles those sets from the progress snapshot and the content source,
 * and composes them with the domain's `readable()` into the one definition every
 * surface binds — B4's count, RBH's readable-words block, R10's close.
 *
 * ALWAYS COMPUTED, NEVER STORED (spec §10.1). No caller may persist a count or a
 * set from this file; recompute from the current snapshot instead. The rule
 * derivation is memoised per `completedStops` identity, which is a cache of work,
 * not of state — a new snapshot is a new key.
 */

import type {StopId} from '../ports/content-ids';
import type {ReadWord} from '../ports/content-model';
import type {ReadWordSource, ScriptReferenceSource, WalkSource} from '../ports/content-source';
import type {Progress} from '../ports/progress-store';

import {readable, type ReadState} from '../domain/readable';

/** The progress items whose ids name letters. The id prefix is the content's kind encoding. */
const LETTER_ID_PREFIX = 'letter.';

export type ReadProgressDeps = {
  readonly walk: WalkSource;
  readonly script: ScriptReferenceSource;
};

export type ReadableWordsDeps = ReadProgressDeps & {
  readonly words: ReadWordSource;
};

/**
 * O9's two sets, from the snapshot: letters met, rules taught.
 *
 * A letter is met when its progress item has left `new`. A rule is taught when a
 * completed Read stop's script states it — a `rule-card` or `rule-statement`
 * position, never a `rule-reprise`, which restates what another stop taught.
 *
 * A null snapshot answers as a first launch: both sets empty.
 */
export async function deriveReadState(
  deps: ReadProgressDeps,
  progress: Progress | null,
): Promise<ReadState> {
  const [metLetterBos, taughtRuleIds] = await Promise.all([
    metLetters(deps.script, progress),
    taughtRules(deps.walk, progress),
  ]);
  return {metLetterBos, taughtRuleIds};
}

/**
 * The words the learner can read right now, in the content's teaching order.
 *
 * The composition B4, RBH and R10 all bind: `deriveReadState` over the snapshot,
 * the full word list, and the domain's `readable()`. With no letters met the
 * answer is empty without listing a word — no word is written with no letters.
 */
export async function readableWords(
  deps: ReadableWordsDeps,
  progress: Progress | null,
): Promise<readonly ReadWord[]> {
  const state = await deriveReadState(deps, progress);
  if (state.metLetterBos.size === 0) {
    return [];
  }
  const words = await deps.words.listReadWords();
  const readableIds = new Set(readable(words, state).map(word => word.id));
  return words.filter(word => readableIds.has(word.id));
}

/**
 * The base letters of every letter item the snapshot has met.
 *
 * A met id the content no longer carries is skipped rather than thrown: progress
 * outlives content builds, and a stale letter cannot make a word readable.
 */
async function metLetters(
  script: ScriptReferenceSource,
  progress: Progress | null,
): Promise<ReadonlySet<string>> {
  const metIds = Object.entries(progress?.items ?? {})
    .filter(([id, item]) => id.startsWith(LETTER_ID_PREFIX) && item.state !== 'new')
    .map(([id]) => id);
  if (metIds.length === 0) {
    return new Set();
  }
  const letters = await script.listLetters();
  const boById = new Map(letters.map(letter => [letter.id as string, letter.bo]));
  const bos = metIds.map(id => boById.get(id)).filter((bo): bo is string => bo !== undefined);
  return new Set(bos);
}

/**
 * The work cache for `taughtRules`, keyed source first so test doubles and a
 * replaced container never read each other's answers.
 */
const taughtRulesCache = new WeakMap<
  WalkSource,
  WeakMap<readonly string[], Promise<ReadonlySet<string>>>
>();

/**
 * The rule ids the completed Read stops have taught.
 *
 * Memoised per `completedStops` identity: the snapshot is immutable, so the same
 * array reference always derives the same set, and a new snapshot brings a new
 * array. The cached value is the derivation's promise, never a number a screen
 * could copy forward.
 */
function taughtRules(walk: WalkSource, progress: Progress | null): Promise<ReadonlySet<string>> {
  const completed = progress?.completedStops;
  if (completed === undefined || completed.length === 0) {
    return Promise.resolve(new Set());
  }
  let byCompleted = taughtRulesCache.get(walk);
  if (byCompleted === undefined) {
    byCompleted = new WeakMap();
    taughtRulesCache.set(walk, byCompleted);
  }
  let derived = byCompleted.get(completed);
  if (derived === undefined) {
    derived = deriveTaughtRules(walk, completed);
    byCompleted.set(completed, derived);
  }
  return derived;
}

async function deriveTaughtRules(
  walk: WalkSource,
  completed: readonly string[],
): Promise<ReadonlySet<string>> {
  const sections = await walk.listSections('read');
  const stopsPerSection = await Promise.all(
    sections.map(section => walk.listStopsBySection(section.id)),
  );
  const readStopIds = new Set(stopsPerSection.flat().map(stop => stop.id as string));
  // Progress stores plain strings; the ids came from the content and are cast
  // back once membership in the Read walk is proven.
  const completedReadStops = completed.filter(id => readStopIds.has(id));
  const scripts = await Promise.all(completedReadStops.map(id => walk.getStopScript(id as StopId)));
  const ruleIds = new Set<string>();
  for (const positions of scripts) {
    for (const position of positions) {
      if (position.kind === 'rule-card' || position.kind === 'rule-statement') {
        ruleIds.add(position.ruleId);
      }
    }
  }
  return ruleIds;
}
