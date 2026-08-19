/**
 * @fileoverview B2 — the district hub: Stops, Words, Phrases and Cards for one
 * place on the Speak map.
 *
 * One route, four views: the segment picked is local UI state, never navigation
 * state, since switching between Stops and Words does not go anywhere.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {useState} from 'react';
import {ScrollView, Text, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {IconButton} from '../../../../src/components/core/icon-button';
import {ListRow} from '../../../../src/components/core/list-row';
import {SegmentedControl, type Segment} from '../../../../src/components/core/segmented-control';
import {EmptyState} from '../../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../../src/components/feedback/skeleton';
import {WordRow} from '../../../../src/components/learning/word-row';
import type {District, PhraseItem, Stop, VocabularyItem} from '../../../../src/ports/content-model';
import type {Progress} from '../../../../src/ports/progress-store';

import {previousDistrict} from '../../../../src/domain/district';
import {selectItemState, selectStopDone, useProgress} from '../../../../src/store/progress';
import {useContent} from '../../../../src/store/use-content';

const SEGMENTS: readonly Segment[] = [
  {label: 'Stops'},
  {label: 'Words'},
  {label: 'Phrases'},
  {label: 'Cards'},
];

const DIMMED: ViewStyle = {opacity: 0.5};

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
        />
      ) : null}
    </View>
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
}: {
  data: HubData;
  progress: Progress | null;
  segment: number;
  onSegment: (index: number) => void;
  onSearch: () => void;
  onWord: (id: string) => void;
  onPhrase: (id: string) => void;
  onStop: (id: string) => void;
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
          {segment === 0 ? (
            <StopsView
              stops={stops}
              progress={progress}
              locked={locked}
              unlockLine={unlockLine}
              onStop={onStop}
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

function StopsView({
  stops,
  progress,
  locked,
  unlockLine,
  onStop,
}: {
  stops: readonly Stop[];
  progress: Progress | null;
  locked: boolean;
  unlockLine: string;
  onStop: (id: string) => void;
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
        {ordered.map(stop => (
          <ListRow
            key={stop.id}
            label={stop.name}
            sub={stop.outcome}
            value={selectStopDone(progress, stop.id) ? 'Done' : undefined}
            chevron={walkable.has(stop.id)}
            onPress={walkable.has(stop.id) ? () => onStop(stop.id) : undefined}
          />
        ))}
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
