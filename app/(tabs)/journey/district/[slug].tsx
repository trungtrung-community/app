/**
 * @fileoverview The district hub (D1): Stops, Words, Phrases and Cards for one
 * place on the Speak map.
 *
 * One route, four views: the segment picked is local UI state, never navigation
 * state, since switching between Stops and Words does not go anywhere.
 *
 * District 23 carries one more thing: B3, the Printing House hook — the designed
 * entry into the Read track, offered once and never nagged. The card shows only
 * while the district is reached and the Read track is untouched, and starting or
 * simply starting to read retires it for good.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {useState} from 'react';
import {ScrollView, Text, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Button} from '../../../../src/components/core/button';
import {Card} from '../../../../src/components/core/card';
import {IconButton} from '../../../../src/components/core/icon-button';
import {ListRow} from '../../../../src/components/core/list-row';
import {SegmentedControl, type Segment} from '../../../../src/components/core/segmented-control';
import {EmptyState} from '../../../../src/components/feedback/empty-state';
import {Sheet} from '../../../../src/components/feedback/sheet';
import {Skeleton} from '../../../../src/components/feedback/skeleton';
import {TibetanText} from '../../../../src/components/learning/tibetan-text';
import {WordRow} from '../../../../src/components/learning/word-row';
import type {District, PhraseItem, Stop, VocabularyItem} from '../../../../src/ports/content-model';
import type {Progress} from '../../../../src/ports/progress-store';

import {previousDistrict} from '../../../../src/domain/district';
import {orderReadStops} from '../../../../src/domain/read-walk';
import {selectItemState, selectStopDone, useProgress} from '../../../../src/store/progress';
import {useContent} from '../../../../src/store/use-content';
import {deriveReadState} from '../../../../src/usecases/read-progress';
import {poolParam} from '../../../../src/usecases/drill-pool';

const SEGMENTS: readonly Segment[] = [
  {label: 'Stops'},
  {label: 'Words'},
  {label: 'Phrases'},
  {label: 'Cards'},
];

const DIMMED: ViewStyle = {opacity: 0.5};

/** The district whose hub carries B3, the designed entry into the Read track. */
const PRINTING_HOUSE = 23;

/**
 * Whether a district is out of reach yet.
 *
 * Stops are walked in order, so a district opens when the one before it is
 * finished: district 1 always opens, own progress opens (a restored backup must
 * never lock a learner out of their own ground), and otherwise every stop of the
 * previous district must be done.
 */
function isDistrictLocked(
  districtNumber: number,
  stops: readonly Stop[],
  previousStops: readonly Stop[],
  progress: Progress | null,
): boolean {
  if (districtNumber === 1) {
    return false;
  }
  if (stops.some(stop => selectStopDone(progress, stop.id))) {
    return false;
  }
  return (
    previousStops.length === 0 || !previousStops.every(stop => selectStopDone(progress, stop.id))
  );
}

/**
 * The stops a row may open: every done stop (a walk can be repeated), plus the
 * first undone one — the "no skipping" order.
 *
 * `ordinal` counts within a circuit, so the walk order is circuit first, then
 * ordinal — sorting on ordinal alone interleaves the two circuits.
 */
function walkableStopIds(stops: readonly Stop[], progress: Progress | null): ReadonlySet<string> {
  const walkable = new Set<string>();
  const ordered = [...stops].sort(
    (a, b) => (a.circuit ?? 0) - (b.circuit ?? 0) || a.ordinal - b.ordinal,
  );
  for (const stop of ordered) {
    if (selectStopDone(progress, stop.id)) {
      walkable.add(stop.id);
    } else {
      walkable.add(stop.id);
      break;
    }
  }
  return walkable;
}

type HubData = {
  district: District;
  stops: readonly Stop[];
  vocabulary: readonly VocabularyItem[];
  phrases: readonly PhraseItem[];
  /** The listed district before this one, and its stops — the unlock rule reads them. */
  previous: District | null;
  previousStops: readonly Stop[];
};

export default function DistrictHub() {
  const {slug} = useLocalSearchParams<{slug: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useProgress(s => s.progress);
  const [segment, setSegment] = useState(0);
  // D1·done: a done stop has two reasonable meanings, so only it opens a sheet.
  const [doneStop, setDoneStop] = useState<Stop | null>(null);

  const load = useContent<HubData>(
    async source => {
      const [district, stops, vocabulary, phrases, districts] = await Promise.all([
        source.getDistrict(slug),
        source.listStopsByDistrict(slug),
        source.listVocabularyByDistrict(slug),
        source.listPhrasesByDistrict(slug),
        source.listDistricts(),
      ]);
      const previous = previousDistrict(districts, district.number);
      const previousStops =
        previous === null ? [] : await source.listStopsByDistrict(previous.slug);
      return {district, stops, vocabulary, phrases, previous, previousStops};
    },
    [slug],
  );

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      {load.status === 'loading' ? <HubSkeleton /> : null}
      {load.status === 'error' ? (
        <View className="px-5 pt-6">
          <EmptyState title="That district is off the map">
            Search again from where you were.
          </EmptyState>
        </View>
      ) : null}
      {load.status === 'ready' ? (
        <Hub
          data={load.data}
          progress={progress}
          segment={segment}
          onSegment={setSegment}
          onSearch={() => router.push('/search')}
          onWord={id => router.push(`/word/${id}`)}
          onPhrase={id => router.push(`/phrase/${id}`)}
          onStop={id => router.push(`/stop/${id}`)}
          onDoneStop={setDoneStop}
        />
      ) : null}
      <DoneStopSheet
        stop={doneStop}
        onClose={() => setDoneStop(null)}
        onWalk={id => {
          setDoneStop(null);
          router.push(`/stop/${id}`);
        }}
        onPractise={id => {
          setDoneStop(null);
          router.push(
            `/practice/picker?pool=${poolParam({kind: 'stop', stopId: id as never})}&entry=district`,
          );
        }}
      />
    </View>
  );
}

type DoneStopSheetProps = {
  stop: Stop | null;
  onClose: () => void;
  onWalk: (id: string) => void;
  onPractise: (id: string) => void;
};

/**
 * D1·done — tapping a stop already finished. Replaying stays the primary
 * action, and the practice door carries the stop's counts so the size of the
 * thing is known before it is chosen (board frame D1·done → Q8·stop).
 */
function DoneStopSheet({stop, onClose, onWalk, onPractise}: DoneStopSheetProps) {
  const words = stop?.items.filter(item => item.kind === 'vocab').length ?? 0;
  const phrases = stop?.items.filter(item => item.kind === 'phrase').length ?? 0;
  const counts = [
    words > 0 ? `${words} ${words === 1 ? 'word' : 'words'}` : null,
    phrases > 0 ? `${phrases} ${phrases === 1 ? 'phrase' : 'phrases'}` : null,
  ]
    .filter(part => part !== null)
    .join(' · ');

  return (
    <Sheet
      open={stop !== null}
      title={stop?.name ?? ''}
      onClose={onClose}
      footer={
        <View className="w-full gap-2">
          <Button fullWidth onPress={() => stop && onWalk(stop.id)}>
            Do this stop again
          </Button>
          <Button variant="secondary" fullWidth onPress={() => stop && onPractise(stop.id)}>
            {counts ? `Practise this stop · ${counts}` : 'Practise this stop'}
          </Button>
        </View>
      }
    >
      <Text className="type-body text-fg-body">{stop?.outcome ?? ''}</Text>
    </Sheet>
  );
}

function Hub({
  data,
  progress,
  segment,
  onSegment,
  onSearch,
  onWord,
  onPhrase,
  onStop,
  onDoneStop,
}: {
  data: HubData;
  progress: Progress | null;
  segment: number;
  onSegment: (index: number) => void;
  onSearch: () => void;
  onWord: (id: string) => void;
  onPhrase: (id: string) => void;
  onStop: (id: string) => void;
  onDoneStop: (stop: Stop) => void;
}) {
  const {district, stops, vocabulary, phrases, previous, previousStops} = data;
  const locked = isDistrictLocked(district.number, stops, previousStops, progress);
  const unlockLine =
    previous === null
      ? 'Finish the district before this one to walk here.'
      : `Finish ${previous.name} to walk here.`;

  return (
    <>
      <View className="flex-row items-start justify-between px-5 py-3">
        <View className="gap-1">
          <Text className="type-label text-fg-accent uppercase">{`District ${district.number}`}</Text>
          <Text accessibilityRole="header" className="type-title text-fg-heading">
            {district.name}
          </Text>
        </View>
        <IconButton icon="search" label="Search" onPress={onSearch} />
      </View>
      <View className="px-5 pb-2">
        <SegmentedControl items={SEGMENTS} active={segment} onChange={onSegment} />
      </View>
      <ScrollView>
        <View className="gap-2 px-5 pb-8">
          {district.number === PRINTING_HOUSE && !locked ? (
            <ReadInvite slug={district.slug} progress={progress} onStart={onStop} />
          ) : null}
          {segment === 0 ? (
            <StopsView
              stops={stops}
              progress={progress}
              locked={locked}
              unlockLine={unlockLine}
              onStop={onStop}
              onDoneStop={onDoneStop}
            />
          ) : null}
          {segment === 1 ? (
            <WordsView vocabulary={vocabulary} progress={progress} onPress={onWord} />
          ) : null}
          {segment === 2 ? (
            <PhrasesView phrases={phrases} progress={progress} onPress={onPhrase} />
          ) : null}
          {segment === 3 ? <EmptyState title="Cards you find here join your collection" /> : null}
        </View>
      </ScrollView>
    </>
  );
}

/** What B3 needs: where the Read walk starts, and the district's own last phrase. */
type InviteData = {
  readonly firstReadStopId: string;
  readonly lastPhrase: PhraseItem | null;
} | null;

/**
 * B3 — the Printing House hook (board frame B3).
 *
 * Shown while the Read track has zero progress: no letter met, no rule taught.
 * Starting to read retires it by that same rule, which is what "offered once"
 * can honestly mean without a stored flag — `AppState` holds no seen-marker for
 * it, and widening the store is not this card's call. The gap: "Not now"
 * dismisses for this visit only, and the card returns on the next one until the
 * learner reads. The board routes the declined offer onward via Q1.
 */
function ReadInvite({
  slug,
  progress,
  onStart,
}: {
  slug: string;
  progress: Progress | null;
  onStart: (stopId: string) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const load = useContent<InviteData>(
    async source => {
      const state = await deriveReadState({walk: source, script: source}, progress);
      if (state.metLetterBos.size > 0 || state.taughtRuleIds.size > 0) {
        return null;
      }
      const sections = await source.listSections('read');
      const stopsPerSection = await Promise.all(
        sections.map(section => source.listStopsBySection(section.id)),
      );
      const ordered = orderReadStops(
        sections,
        new Map(sections.map((section, i) => [section.id, stopsPerSection[i] ?? []])),
      );
      const first = ordered[0];
      if (first === undefined) {
        return null;
      }
      const phrases = await source.listPhrasesByDistrict(slug);
      return {firstReadStopId: first.id, lastPhrase: phrases.at(-1) ?? null};
    },
    [slug, progress],
  );

  if (dismissed || load.status !== 'ready' || load.data === null) {
    return null;
  }
  const {firstReadStopId, lastPhrase} = load.data;

  return (
    <Card>
      <View className="gap-3">
        {lastPhrase !== null ? (
          <TibetanText size="lg" roman={lastPhrase.roman}>
            {lastPhrase.bo}
          </TibetanText>
        ) : null}
        <Text className="type-body text-fg-body">
          The writing has been on every card you&apos;ve collected. Want to learn to read it?
        </Text>
        <Button fullWidth onPress={() => onStart(firstReadStopId)}>
          Start the script
        </Button>
        <Button variant="ghost" fullWidth onPress={() => setDismissed(true)}>
          Not now
        </Button>
      </View>
    </Card>
  );
}

function StopsView({
  stops,
  progress,
  locked,
  unlockLine,
  onStop,
  onDoneStop,
}: {
  stops: readonly Stop[];
  progress: Progress | null;
  locked: boolean;
  unlockLine: string;
  onStop: (id: string) => void;
  onDoneStop: (stop: Stop) => void;
}) {
  if (stops.length === 0) {
    return <EmptyState title="This district's stops arrive as the walk is written" />;
  }
  const walkable = locked ? new Set<string>() : walkableStopIds(stops, progress);
  const ordered = [...stops].sort(
    (a, b) => (a.circuit ?? 0) - (b.circuit ?? 0) || a.ordinal - b.ordinal,
  );
  return (
    <>
      {locked ? <Text className="type-body text-fg-muted">{unlockLine}</Text> : null}
      <View className="gap-2" style={locked ? DIMMED : undefined}>
        {ordered.map(stop => {
          const done = selectStopDone(progress, stop.id);
          return (
            <ListRow
              key={stop.id}
              label={stop.name}
              sub={stop.outcome}
              value={done ? 'Done' : undefined}
              chevron={walkable.has(stop.id)}
              onPress={
                walkable.has(stop.id)
                  ? () => (done ? onDoneStop(stop) : onStop(stop.id))
                  : undefined
              }
            />
          );
        })}
      </View>
    </>
  );
}

function WordsView({
  vocabulary,
  progress,
  onPress,
}: {
  vocabulary: readonly VocabularyItem[];
  progress: Progress | null;
  onPress: (id: string) => void;
}) {
  if (vocabulary.length === 0) {
    return <EmptyState title="This district's words arrive as the walk is written" />;
  }
  return (
    <>
      {vocabulary.map(word => (
        <WordRow
          key={word.id}
          bo={word.bo}
          roman={word.roman}
          en={word.en}
          status={selectItemState(progress, word.id)}
          register={word.register}
          audio={word.audio.available}
          onPress={() => onPress(word.id)}
        />
      ))}
    </>
  );
}

function PhrasesView({
  phrases,
  progress,
  onPress,
}: {
  phrases: readonly PhraseItem[];
  progress: Progress | null;
  onPress: (id: string) => void;
}) {
  if (phrases.length === 0) {
    return <EmptyState title="This district's phrases arrive as the walk is written" />;
  }
  return (
    <>
      {phrases.map(phrase => (
        <WordRow
          key={phrase.id}
          bo={phrase.bo}
          roman={phrase.roman}
          en={phrase.en}
          status={selectItemState(progress, phrase.id)}
          register={phrase.register}
          audio={phrase.audio.available}
          onPress={() => onPress(phrase.id)}
        />
      ))}
    </>
  );
}

/** Loading keeps the ready layout's shape: header, segmented control, then rows. */
function HubSkeleton() {
  return (
    <View className="gap-4 px-5 py-3">
      <Skeleton shape="text" width={140} />
      <Skeleton shape="block" height={40} />
      <View className="gap-2">
        <Skeleton shape="block" height={64} />
        <Skeleton shape="block" height={64} />
        <Skeleton shape="block" height={64} />
      </View>
    </View>
  );
}
