/**
 * @fileoverview L9 — finding the root: the cue ladder, studied after the walk.
 *
 * Six rungs from `listReadCues`, rendered verbatim — headline, emphasis and
 * sentence are the data's wording, never typed here. Each rung gets one worked
 * example where one can be found honestly: the cue rows carry no example of
 * their own, so the example is the first single-syllable Read word whose shape
 * the rung settles, classified by the ladder's own order. The root is drawn at
 * full ink with the other line letters muted — dim-never-decorate — and the
 * caption names what is held, per docs/04's text-equivalent rule.
 *
 * The board's three "when the shape cannot decide" cards state corpus claims
 * (the six two-way spellings, the མའི joining syllable) that no content row
 * carries, so they are absent rather than typed — they arrive when the content
 * set states them.
 */

import {ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {EmptyState} from '../src/components/feedback/empty-state';
import {Skeleton} from '../src/components/feedback/skeleton';
import {mixedTibetan, TibetanText} from '../src/components/learning/tibetan-text';
import type {ReadCue, ReadWord} from '../src/ports/content-model';

import {lineLetters} from '../src/domain/tibetan';
import {useContent} from '../src/store/use-content';

type LadderData = {
  cues: readonly ReadCue[];
  /** The worked example per rung number, where one exists in the word list. */
  examples: ReadonlyMap<number, WorkedExample>;
};

export default function CueLadder() {
  const insets = useSafeAreaInsets();

  const load = useContent<LadderData>(async source => {
    const [cues, words] = await Promise.all([source.listReadCues(), source.listReadWords()]);
    return {cues, examples: workedExamples(cues, words)};
  }, []);

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-4 px-5 pb-8" style={{paddingTop: insets.top}}>
        <View className="gap-1 pt-3">
          <Text accessibilityRole="header" className="type-title text-fg-heading">
            Finding the root
          </Text>
          <Text className="type-body text-fg-muted">
            Check these in order. Stop at the first one that fits.
          </Text>
        </View>
        {load.status === 'loading' ? <LadderSkeleton /> : null}
        {load.status === 'error' ? (
          <EmptyState title="The ladder is off the wall">Try opening it again.</EmptyState>
        ) : null}
        {load.status === 'ready' ? (
          <>
            <View className="gap-1 rounded-lg bg-surface-card px-4 py-2">
              {load.data.cues.map(cue => (
                <Rung key={cue.id} cue={cue} />
              ))}
            </View>
            <Text className="type-label text-fg-muted uppercase">One word for each rung</Text>
            {load.data.cues.map(cue => {
              const example = load.data.examples.get(cue.n);
              return example === undefined ? null : (
                <WorkedCard key={cue.id} cue={cue} example={example} />
              );
            })}
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

type RungProps = {
  cue: ReadCue;
};

/** One rung, verbatim from the data: headline, emphasis, sentence. */
function Rung({cue}: RungProps) {
  return (
    <View className="flex-row items-start gap-3 py-2">
      <View className="bg-surface-accent-soft h-6 w-6 items-center justify-center rounded-full">
        <Text className="type-label text-fg-accent">{String(cue.n)}</Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="type-body-strong text-fg-heading">{mixedTibetan(cue.headline)}</Text>
        <Text className="type-label text-fg-accent uppercase">{mixedTibetan(cue.emphasis)}</Text>
        <Text className="type-caption text-fg-muted">{mixedTibetan(cue.sentence)}</Text>
      </View>
    </View>
  );
}

/** A word one rung settles: its glyphs, the root position, and the word itself. */
type WorkedExample = {
  readonly word: ReadWord;
  readonly syllable: string;
  /** Which line letter the rung names as root, 0-based. */
  readonly rootIndex: number;
  /** The base consonant at that position, for the caption. */
  readonly rootLetter: string;
};

type WorkedCardProps = {
  cue: ReadCue;
  example: WorkedExample;
};

function WorkedCard({cue, example}: WorkedCardProps) {
  const caption = `root ${example.rootLetter}`;
  return (
    <View className="flex-row items-center gap-4 rounded-lg bg-surface-card p-4">
      <View className="items-center gap-1">
        <TibetanText
          size="xl"
          align="center"
          highlight={example.rootIndex}
          highlightLabel={caption}
        >
          {example.syllable}
        </TibetanText>
        <Text className="type-caption text-fg-accent">{mixedTibetan(caption)}</Text>
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="type-label text-fg-subtle uppercase">{`Rung ${cue.n}`}</Text>
        {example.word.reading !== null ? (
          <Text className="type-body-strong text-fg-accent">{example.word.reading}</Text>
        ) : null}
        {example.word.glosses.length > 0 ? (
          <Text className="type-caption text-fg-muted">{example.word.glosses.join(', ')}</Text>
        ) : null}
      </View>
    </View>
  );
}

/**
 * The first single-syllable word each rung settles, in teaching order.
 *
 * The classifier is the ladder itself, applied in rung order — the same
 * check-in-order rule the header states. The two letter sets it consults (the
 * final ས, the ག ང བ མ middles) restate rung 3's own sentence; they live here
 * because a classifier is behaviour, while every rendered word stays the data's.
 */
function workedExamples(
  cues: readonly ReadCue[],
  words: readonly ReadWord[],
): ReadonlyMap<number, WorkedExample> {
  const examples = new Map<number, WorkedExample>();
  for (const word of words) {
    if (word.syllables.length !== 1) {
      continue;
    }
    const syllable = word.syllables[0];
    if (syllable === undefined) {
      continue;
    }
    const settled = classify(syllable);
    if (settled === null || examples.has(settled.rung)) {
      continue;
    }
    examples.set(settled.rung, {
      word,
      syllable,
      rootIndex: settled.rootIndex,
      rootLetter: settled.rootLetter,
    });
    if (examples.size === cues.length) {
      break;
    }
  }
  return examples;
}

/** The middle letters rung 3 names as a suffix before ས. */
const RUNG_THREE_MIDDLES: ReadonlySet<string> = new Set(['ག', 'ང', 'བ', 'མ']);
const SUFFIX_SA = 'ས';

type Classified = {
  readonly rung: number;
  readonly rootIndex: number;
  readonly rootLetter: string;
};

/** A line letter with nothing above or below it — a single bare consonant. */
function bare(letter: string): boolean {
  return Array.from(letter).length === 1;
}

/** The base consonant of one line letter — its first character. */
function baseOf(letter: string): string {
  return Array.from(letter)[0] ?? letter;
}

/** Which rung settles this syllable, tried in rung order, or null when none does. */
function classify(syllable: string): Classified | null {
  const letters = lineLetters(syllable);
  if (letters.length === 1) {
    const only = letters[0];
    return only === undefined ? null : {rung: 1, rootIndex: 0, rootLetter: baseOf(only)};
  }
  const marked = letters.findIndex(letter => !bare(letter));
  if (marked !== -1) {
    const carrier = letters[marked];
    return carrier === undefined ? null : {rung: 2, rootIndex: marked, rootLetter: baseOf(carrier)};
  }
  if (letters.length === 3) {
    const [first, middle, last] = letters;
    if (first === undefined || middle === undefined || last === undefined) {
      return null;
    }
    if (last === SUFFIX_SA && RUNG_THREE_MIDDLES.has(middle)) {
      return {rung: 3, rootIndex: 0, rootLetter: baseOf(first)};
    }
    return {rung: 4, rootIndex: 1, rootLetter: baseOf(middle)};
  }
  if (letters.length === 4) {
    const second = letters[1];
    return second === undefined ? null : {rung: 5, rootIndex: 1, rootLetter: baseOf(second)};
  }
  if (letters.length === 2) {
    const first = letters[0];
    return first === undefined ? null : {rung: 6, rootIndex: 0, rootLetter: baseOf(first)};
  }
  return null;
}

/** Loading keeps the ready layout's shape: the ladder card, then worked rows. */
function LadderSkeleton() {
  return (
    <View className="gap-3">
      <Skeleton shape="block" height={280} />
      <Skeleton shape="block" height={88} />
      <Skeleton shape="block" height={88} />
    </View>
  );
}
