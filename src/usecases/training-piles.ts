/**
 * @fileoverview The training ground's piles — docs/03 §4.3's table, held as data.
 *
 * Eight piles, each a query against one content capability. The counts are never
 * typed here or anywhere: every figure a screen shows derives from the source at
 * the learner's section, which is what the board's "pile counts bind to data"
 * demands and what keeps a regenerated dataset from stranding a literal.
 *
 * The gate is §4.3's: "An item enters its pile only after the stop that teaches
 * it." The port scopes the Read inventory by section, so the gate is carried as
 * `maxSection` — the learner's highest completed Read section, derived by
 * `readSectionCeiling` from the completed stops. A pile with nothing taught yet
 * is absent from `pileCounts`, never present at zero.
 *
 * Takes the four narrow capabilities rather than `ContentSource`, exactly as
 * `gatherPool` does, so a test hands in small doubles.
 */

import type {AudioRef} from '../ports/content-ids';
import type {Letter, ReadWord, Section, Stack, Stop, Syllable} from '../ports/content-model';
import type {
  ReadWordSource,
  ScriptReferenceSource,
  StackSource,
  SyllableSource,
} from '../ports/content-source';

/** The eight piles of docs/03 §4.3, in the table's order. */
export type TrainingPileId =
  | 'the-thirty'
  | 'letter-vowel'
  | 'stacks'
  | 'stack-vowel'
  | 'endings'
  | 'ending-grid'
  | 'real-syllables'
  | 'whole-words';

/** What the piles read: letters, stacks, syllables and Read words, nothing else. */
export type TrainingPileSources = ScriptReferenceSource &
  StackSource &
  SyllableSource &
  ReadWordSource;

/**
 * One card of a pile.
 *
 * `reading` is what the reveal shows — the sound, in the Trungtrung
 * romanization the source carries. `gloss` is filled only for whole words,
 * where the word means something beyond its sound. `audio` is what the reveal
 * plays, where the content has a take.
 */
export type TrainingCard = {
  readonly bo: string;
  readonly reading: string;
  readonly gloss: string | null;
  readonly audio: AudioRef | null;
};

/** One pile the chooser offers: the board's title, the count in its own unit. */
export type PileCount = {
  readonly id: TrainingPileId;
  readonly title: string;
  readonly unit: string;
  readonly count: number;
};

function toLetterCard(letter: Letter): TrainingCard {
  return {
    bo: letter.bo,
    // The thirty are said by name. The fixture leaves `name` unfilled, so the
    // wylie stands in rather than the card arriving with nothing to reveal.
    reading: letter.name ?? letter.wylie ?? letter.bo,
    gloss: null,
    audio: letter.audio,
  };
}

function toStackCard(stack: Stack): TrainingCard {
  return {
    bo: stack.bo,
    reading: stack.reading ?? stack.wylie,
    gloss: null,
    audio: stack.audio,
  };
}

function toSyllableCard(syllable: Syllable): TrainingCard {
  return {
    bo: syllable.bo,
    reading: syllable.reading ?? syllable.wylie,
    gloss: null,
    audio: syllable.audio,
  };
}

function toWordCard(word: ReadWord): TrainingCard {
  return {
    bo: word.bo,
    reading: word.reading ?? word.wylie ?? word.bo,
    gloss: word.glosses.length === 0 ? null : word.glosses.join(', '),
    audio: word.audio,
  };
}

async function taughtLetters(
  deps: TrainingPileSources,
  maxSection: number,
): Promise<readonly Letter[]> {
  const letters = await deps.listLetters();
  return letters.filter(letter => letter.subtype === 'consonant' && letter.section <= maxSection);
}

async function taughtStacks(
  deps: TrainingPileSources,
  maxSection: number,
): Promise<readonly Stack[]> {
  const stacks = await deps.listStacks();
  return stacks.filter(stack => stack.section <= maxSection);
}

async function taughtWords(
  deps: TrainingPileSources,
  maxSection: number,
): Promise<readonly ReadWord[]> {
  const words = await deps.listReadWords();
  return words.filter(word => word.section <= maxSection);
}

type PileSpec = {
  readonly id: TrainingPileId;
  readonly title: string;
  readonly unit: string;
  count(deps: TrainingPileSources, maxSection: number): Promise<number>;
  list(deps: TrainingPileSources, maxSection: number): Promise<readonly TrainingCard[]>;
};

/** A pile over one or more syllable families, counted without assembling it. */
function syllablePile(id: TrainingPileId, title: string, families: readonly string[]): PileSpec {
  return {
    id,
    title,
    unit: 'syllables',
    async count(deps, maxSection) {
      const counts = await Promise.all(
        families.map(family => deps.countSyllables(family, maxSection)),
      );
      return counts.reduce((sum, n) => sum + n, 0);
    },
    async list(deps, maxSection) {
      const lists = await Promise.all(
        families.map(family => deps.listSyllables(family, maxSection)),
      );
      return lists.flat().map(toSyllableCard);
    },
  };
}

/**
 * The registry itself — docs/03 §4.3's rows, titled as the board's Q6 pills
 * title them ("The thirty · 30"); the three rows the board round predates take
 * the doc table's own names.
 */
const PILES: readonly PileSpec[] = [
  {
    id: 'the-thirty',
    title: 'The thirty',
    unit: 'letters',
    count: async (deps, maxSection) => (await taughtLetters(deps, maxSection)).length,
    list: async (deps, maxSection) => (await taughtLetters(deps, maxSection)).map(toLetterCard),
  },
  syllablePile('letter-vowel', 'Letter × vowel', ['grid']),
  {
    id: 'stacks',
    title: 'Stacks',
    unit: 'stacks',
    count: async (deps, maxSection) => (await taughtStacks(deps, maxSection)).length,
    list: async (deps, maxSection) => (await taughtStacks(deps, maxSection)).map(toStackCard),
  },
  syllablePile('stack-vowel', 'Stacks × vowel', ['stack-grid']),
  syllablePile('endings', 'Endings', ['demo']),
  syllablePile('ending-grid', 'Every root, every ending', ['ending-grid']),
  syllablePile('real-syllables', 'Real syllables', ['worked', 'corpus']),
  {
    id: 'whole-words',
    title: 'Whole words',
    unit: 'words',
    count: async (deps, maxSection) => (await taughtWords(deps, maxSection)).length,
    list: async (deps, maxSection) => (await taughtWords(deps, maxSection)).map(toWordCard),
  },
];

/**
 * The learner's highest completed Read section, as the gate's `maxSection`.
 *
 * Pure over what the walk answered: the sections of one track, and the stop
 * records behind `completedStops`. Speak stops do not open Read piles, so they
 * are ignored; a learner with no Read stop completed gets 0, which empties
 * every pile.
 */
export function readSectionCeiling(
  sections: readonly Section[],
  completedStops: readonly Stop[],
): number {
  const numberById = new Map(sections.map(section => [section.id, section.number]));
  return completedStops
    .filter(stop => stop.track === 'read')
    .reduce((ceiling, stop) => Math.max(ceiling, numberById.get(stop.sectionId) ?? 0), 0);
}

/**
 * The piles the chooser offers at this learner's section, in table order.
 *
 * A pile with zero items taught is absent, never present at zero — the same
 * rule Q1 applies to a district not yet reached.
 */
export async function pileCounts(
  deps: TrainingPileSources,
  maxSection: number,
): Promise<readonly PileCount[]> {
  const counted = await Promise.all(
    PILES.map(async ({id, title, unit, count}) => ({
      id,
      title,
      unit,
      count: await count(deps, maxSection),
    })),
  );
  return counted.filter(pile => pile.count > 0);
}

/**
 * One pile's cards, shuffled for a drill.
 *
 * @param rng A `Math.random`-shaped source of [0, 1). Injected so a test can
 *   fix the order.
 */
export async function drawPile(
  deps: TrainingPileSources,
  pileId: TrainingPileId,
  maxSection: number,
  rng: () => number,
): Promise<readonly TrainingCard[]> {
  const spec = PILES.find(pile => pile.id === pileId);
  if (spec === undefined) {
    throw new Error(`Unknown training pile: ${pileId}`);
  }
  const cards = [...(await spec.list(deps, maxSection))];
  // Fisher–Yates, driven by the injected rng.
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j] as TrainingCard, cards[i] as TrainingCard];
  }
  return cards;
}
