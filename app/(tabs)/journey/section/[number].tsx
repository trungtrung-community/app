/**
 * @fileoverview RBH — the Read section hub: Stops, Letters and Reference for one
 * chapter of the Read track.
 *
 * Lock-step with the district hub (B2): one route, the segment picked is local
 * UI state. Stops draws the section's rail under the track's strictly linear
 * unlock rule; Letters is RB1 inline — the letters this section teaches, count
 * bound to `listLetters` filtered on `Letter.section`; Reference opens the
 * script browser (L1).
 *
 * Doors the board draws that arrive with the ports task, absent here rather
 * than disabled: the Stacks segment (RB2), the rest of the Reference segment
 * ("The seven that attach" → L7, the two stack tables → L8, "Finding the
 * root" → L9), the training-ground door, and the readable-words block — all of
 * them need port capabilities the content source does not serve yet.
 */

import {useLocalSearchParams, useRouter} from 'expo-router';
import {useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {IconButton} from '../../../../src/components/core/icon-button';
import {ListRow} from '../../../../src/components/core/list-row';
import {SegmentedControl, type Segment} from '../../../../src/components/core/segmented-control';
import {EmptyState} from '../../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../../src/components/feedback/skeleton';
import {AudioButton} from '../../../../src/components/learning/audio-button';
import {HeadRail, type RailStop} from '../../../../src/components/learning/head-rail';
import {LetterTile} from '../../../../src/components/learning/letter-tile';
import {ProgressBar} from '../../../../src/components/learning/progress-bar';
import {TibetanText} from '../../../../src/components/learning/tibetan-text';
import type {Letter, Section, Stop} from '../../../../src/ports/content-model';
import type {Progress} from '../../../../src/ports/progress-store';

import {orderReadStops, walkableReadStopIds} from '../../../../src/domain/read-walk';
import {selectItemState, selectStopDone, useProgress} from '../../../../src/store/progress';
import {useContent} from '../../../../src/store/use-content';

type HubData = {
  section: Section;
  /** The section's own stops, in walking order. */
  stops: readonly Stop[];
  /** Every Read stop in track order — the linear unlock rule reads all of it. */
  walk: readonly Stop[];
  /** The letters this section teaches, from `Letter.section`. */
  letters: readonly Letter[];
};

export default function ReadSectionHub() {
  const {number} = useLocalSearchParams<{number: string}>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useProgress(s => s.progress);
  const [segment, setSegment] = useState(0);

  const load = useContent<HubData>(
    async source => {
      const sections = await source.listSections('read');
      const section = sections.find(candidate => candidate.number === Number(number));
      if (section === undefined) {
        throw new Error(`content: no Read section ${number}`);
      }
      const allStops = await Promise.all(
        sections.map(candidate => source.listStopsBySection(candidate.id)),
      );
      const stopsBySection = new Map(
        sections.map((candidate, i) => [candidate.id, allStops[i] ?? []]),
      );
      const walk = orderReadStops(sections, stopsBySection);
      const stops = walk.filter(stop => stop.sectionId === section.id);
      const letters = (await source.listLetters()).filter(
        letter => letter.section === section.number,
      );
      return {section, stops, walk, letters};
    },
    [number],
  );

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      {load.status === 'loading' ? <HubSkeleton /> : null}
      {load.status === 'error' ? (
        <View className="px-5 pt-6">
          <EmptyState title="That section is off the map">
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
          onStop={id => router.push(`/stop/${id}`)}
          onLetter={id => router.push(`/letter/${id}`)}
          onScript={() => router.push('/script')}
        />
      ) : null}
    </View>
  );
}

type HubProps = {
  data: HubData;
  progress: Progress | null;
  segment: number;
  onSegment: (index: number) => void;
  onSearch: () => void;
  onStop: (id: string) => void;
  onLetter: (id: string) => void;
  onScript: () => void;
};

function Hub({data, progress, segment, onSegment, onSearch, onStop, onLetter, onScript}: HubProps) {
  const {section, stops, walk, letters} = data;
  const done = stops.filter(stop => selectStopDone(progress, stop.id)).length;

  const segments: readonly Segment[] = [
    {label: 'Stops'},
    {label: 'Letters', count: letters.length > 0 ? String(letters.length) : undefined},
    {label: 'Reference'},
  ];

  return (
    <>
      <View className="flex-row items-start justify-between px-5 py-3">
        <View className="flex-1 gap-1 pr-3">
          <Text className="type-label text-fg-accent uppercase">
            {`Section ${section.number} · Read`}
          </Text>
          <Text accessibilityRole="header" className="type-title text-fg-heading">
            {section.name}
          </Text>
          {section.nameBo !== null ? <TibetanText size="xs">{section.nameBo}</TibetanText> : null}
        </View>
        <IconButton icon="search" label="Search" onPress={onSearch} />
      </View>
      {stops.length > 0 ? (
        <View className="gap-1 px-5 pb-2">
          <ProgressBar value={done} max={stops.length} height={10} />
          <Text className="type-label text-fg-accent uppercase">
            {`Stop ${Math.min(done + 1, stops.length)} of ${stops.length}`}
          </Text>
        </View>
      ) : null}
      <View className="px-5 pb-2">
        <SegmentedControl items={segments} active={segment} onChange={onSegment} />
      </View>
      <ScrollView>
        <View className="gap-2 px-5 pb-8">
          {segment === 0 ? (
            <StopsView stops={stops} walk={walk} progress={progress} onStop={onStop} />
          ) : null}
          {segment === 1 ? (
            <LettersView
              section={section}
              letters={letters}
              progress={progress}
              onLetter={onLetter}
            />
          ) : null}
          {segment === 2 ? <ReferenceView onScript={onScript} /> : null}
        </View>
      </ScrollView>
    </>
  );
}

type StopsViewProps = {
  stops: readonly Stop[];
  walk: readonly Stop[];
  progress: Progress | null;
  onStop: (id: string) => void;
};

/** The section's rail, straight, under the track-wide linear unlock rule. */
function StopsView({stops, walk, progress, onStop}: StopsViewProps) {
  if (stops.length === 0) {
    return <EmptyState title="This section's stops arrive as the walk is written" />;
  }
  const walkable = walkableReadStopIds(walk, id => selectStopDone(progress, id));
  const nodes: RailStop[] = stops.map(stop => {
    const stopDone = selectStopDone(progress, stop.id);
    return {
      id: stop.id,
      state: stopDone ? 'done' : walkable.has(stop.id) ? 'current' : 'locked',
      label: stop.name,
    };
  });
  return (
    <View className="items-center">
      <HeadRail
        nodes={nodes}
        variant="straight"
        onSelect={node => {
          if (node.id !== undefined && walkable.has(node.id)) {
            onStop(node.id);
          }
        }}
      />
    </View>
  );
}

type LettersViewProps = {
  section: Section;
  letters: readonly Letter[];
  progress: Progress | null;
  onLetter: (id: string) => void;
};

/**
 * RB1 inline — the letters this section teaches, grouped by their row in the
 * thirty where they have one. Counts come from the list itself, never typed.
 */
function LettersView({section, letters, progress, onLetter}: LettersViewProps) {
  if (letters.length === 0) {
    return <EmptyState title="This section teaches no new letters" />;
  }
  const met = letters.filter(letter => selectItemState(progress, letter.id) !== 'new').length;
  const noun = letters.length === 1 ? 'letter' : 'letters';
  const groups = groupLetters(letters);

  return (
    <>
      <Text className="type-caption text-fg-muted">
        {`Section ${section.number} · ${letters.length} ${noun} · ${met} met`}
      </Text>
      {groups.map(group => (
        <View key={group.key} className="gap-2">
          {group.label !== null ? (
            <Text className="type-label text-fg-muted pt-2 uppercase">{group.label}</Text>
          ) : null}
          {group.letters.map(letter => (
            <LetterRow
              key={letter.id}
              letter={letter}
              rowLabel={group.rowName}
              met={selectItemState(progress, letter.id) !== 'new'}
              onPress={() => onLetter(letter.id)}
            />
          ))}
        </View>
      ))}
    </>
  );
}

type LetterGroup = {
  readonly key: string;
  /** "The ka row", from the row's first letter. Null for letters outside the thirty. */
  readonly label: string | null;
  /** The bare row name the per-letter caption reuses: "ka". */
  readonly rowName: string | null;
  readonly letters: readonly Letter[];
};

/** Consonants grouped by their row in the thirty; everything else in one flat group. */
function groupLetters(letters: readonly Letter[]): readonly LetterGroup[] {
  const inRows = letters
    .filter(letter => letter.row !== null)
    .sort((a, b) => (a.row ?? 0) - (b.row ?? 0) || (a.column ?? 0) - (b.column ?? 0));
  const outside = letters.filter(letter => letter.row === null);

  const groups: LetterGroup[] = [];
  for (const letter of inRows) {
    const last = groups[groups.length - 1];
    if (last && last.key === `row-${letter.row}`) {
      groups[groups.length - 1] = {...last, letters: [...last.letters, letter]};
      continue;
    }
    const rowName = letter.name;
    groups.push({
      key: `row-${letter.row}`,
      label: rowName === null ? null : `The ${rowName} row`,
      rowName,
      letters: [letter],
    });
  }
  if (outside.length > 0) {
    groups.push({key: 'outside', label: null, rowName: null, letters: outside});
  }
  return groups;
}

type LetterRowProps = {
  letter: Letter;
  rowLabel: string | null;
  met: boolean;
  onPress: () => void;
};

function LetterRow({letter, rowLabel, met, onPress}: LetterRowProps) {
  const caption = letterCaption(letter, rowLabel);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={letter.name ?? letter.bo}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-lg bg-surface-card p-3"
    >
      <LetterTile glyph={letter.bo} size="md" state={met ? 'learned' : 'notYet'} />
      <View className="flex-1 gap-1">
        {letter.name !== null ? (
          <Text className="type-body-strong text-fg-accent">{letter.name}</Text>
        ) : null}
        {caption !== null ? <Text className="type-caption text-fg-muted">{caption}</Text> : null}
      </View>
      {letter.audio?.available ? <AudioButton size="sm" /> : null}
    </Pressable>
  );
}

/** "ka row · unaspirated" for the thirty; the letter's own kind elsewhere. */
function letterCaption(letter: Letter, rowLabel: string | null): string | null {
  if (rowLabel !== null && letter.columnName !== null) {
    return `${rowLabel} row · ${letter.columnName}`;
  }
  if (letter.subtype === 'vowel' && letter.position !== null) {
    return `vowel mark · sits ${letter.position}`;
  }
  if (letter.subtype === 'numeral' && letter.value !== null) {
    return `numeral · ${letter.value}`;
  }
  if (letter.subtype === 'sanskrit') {
    return 'recognition only';
  }
  return null;
}

type ReferenceViewProps = {
  onScript: () => void;
};

/**
 * The hub's Reference segment, reduced to the one door the content source can
 * serve: the script browser. The board's other three rows arrive with the ports
 * task — see the fileoverview.
 */
function ReferenceView({onScript}: ReferenceViewProps) {
  return (
    <ListRow
      label="The script"
      sub="All thirty, and everything that combines with them"
      chevron
      onPress={onScript}
    />
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
