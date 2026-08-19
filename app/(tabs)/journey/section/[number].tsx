/**
 * @fileoverview RBH — the Read section hub: Stops, Letters and Reference for one
 * chapter of the Read track.
 *
 * Lock-step with the district hub (B2): one route, the segment picked is local
 * UI state. Stops draws the section's rail under the track's strictly linear
 * unlock rule, with the "Ready for the exam" door under it on the two exam
 * sections once the walk has covered them; Letters is RB1 inline — the letters
 * this section teaches, count bound to `listLetters` filtered on
 * `Letter.section`; Stacks is RB2 inline — the section's stacks grouped by
 * their `group`, both readings shown where the glyph underdetermines them;
 * Reference opens the script browser (L1), the combiner index (L7) and the
 * cue ladder (L9).
 *
 * Under the rail: the training-ground door, and the readable-words block —
 * the Read track's proof surface, bound to `readableWords()` over the live
 * snapshot, a function and never a frozen number.
 *
 * Doors the board draws that stay absent rather than disabled: the Reference
 * segment's "Stacks · the two tables" row (L6 has no route yet), RB2's
 * "Practise these stacks" button (RB16 — the drill machine has no stack mode),
 * and the readable block's "Read these" button (no readable-words list route
 * exists yet to open).
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
import {SyllableChip} from '../../../../src/components/learning/syllable-chip';
import {mixedTibetan, TibetanText} from '../../../../src/components/learning/tibetan-text';
import type {Letter, ReadWord, Section, Stack, Stop} from '../../../../src/ports/content-model';
import type {Progress} from '../../../../src/ports/progress-store';

import {orderReadStops, walkableReadStopIds} from '../../../../src/domain/read-walk';
import {playClip} from '../../../../src/composition/play';
import {selectItemState, selectStopDone, useProgress} from '../../../../src/store/progress';
import {useContent} from '../../../../src/store/use-content';
import {deriveReadState, readableWords} from '../../../../src/usecases/read-progress';
import {EXAM_SECTIONS} from '../index';

type HubData = {
  section: Section;
  /** The section's own stops, in walking order. */
  stops: readonly Stop[];
  /** Every Read stop in track order — the linear unlock rule reads all of it. */
  walk: readonly Stop[];
  /** The letters this section teaches, from `Letter.section`. */
  letters: readonly Letter[];
  /** The stacks this section teaches, from `Stack.section`. */
  stacks: readonly Stack[];
  /** Letter names by glyph, for the stack rows' base captions. */
  letterOrder: ReadonlyMap<string, LetterPlace>;
  /** Each section's number by id, for reading the walk against this section. */
  sectionNumbers: ReadonlyMap<string, number>;
};

/** Where a letter sits in the thirty, and what it is called. */
type LetterPlace = {
  readonly name: string | null;
  /** Grid position for alphabet ordering; letters outside the thirty sort last. */
  readonly order: number;
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
      const [allLetters, allStacks] = await Promise.all([
        source.listLetters(),
        source.listStacks(),
      ]);
      const letters = allLetters.filter(letter => letter.section === section.number);
      const stacks = allStacks.filter(stack => stack.section === section.number);
      const letterOrder = new Map<string, LetterPlace>(
        allLetters.map(letter => [
          letter.bo,
          {
            name: letter.name,
            order:
              letter.row === null
                ? Number.MAX_SAFE_INTEGER
                : letter.row * 100 + (letter.column ?? 0),
          },
        ]),
      );
      const sectionNumbers = new Map<string, number>(
        sections.map(candidate => [candidate.id, candidate.number]),
      );
      return {section, stops, walk, letters, stacks, letterOrder, sectionNumbers};
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
          onStack={id => router.push(`/stack/${id}`)}
          onScript={() => router.push('/script')}
          onCombiners={() => router.push('/combiner')}
          onCueLadder={() => router.push('/cue-ladder')}
          onExam={sectionNumber => router.push(`/exam/${sectionNumber}`)}
          onTraining={() => router.push('/training-ground')}
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
  onStack: (id: string) => void;
  onScript: () => void;
  onCombiners: () => void;
  onCueLadder: () => void;
  onExam: (sectionNumber: number) => void;
  onTraining: () => void;
};

function Hub({
  data,
  progress,
  segment,
  onSegment,
  onSearch,
  onStop,
  onLetter,
  onStack,
  onScript,
  onCombiners,
  onCueLadder,
  onExam,
  onTraining,
}: HubProps) {
  const {section, stops, walk, letters, stacks, letterOrder, sectionNumbers} = data;
  const done = stops.filter(stop => selectStopDone(progress, stop.id)).length;

  const segments: readonly Segment[] = [
    {label: 'Stops'},
    {label: 'Letters', count: letters.length > 0 ? String(letters.length) : undefined},
    {label: 'Stacks', count: stacks.length > 0 ? String(stacks.length) : undefined},
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
            <>
              <StopsView
                section={section}
                stops={stops}
                walk={walk}
                sectionNumbers={sectionNumbers}
                progress={progress}
                onStop={onStop}
                onExam={onExam}
              />
              <ListRow
                label="The training ground"
                sub="Volume, outside the walk. Never scored."
                icon="sparkles"
                chevron
                onPress={onTraining}
              />
              <ReadableBlock progress={progress} />
            </>
          ) : null}
          {segment === 1 ? (
            <LettersView
              section={section}
              letters={letters}
              progress={progress}
              onLetter={onLetter}
            />
          ) : null}
          {segment === 2 ? (
            <StacksView
              section={section}
              stacks={stacks}
              letterOrder={letterOrder}
              onStack={onStack}
            />
          ) : null}
          {segment === 3 ? (
            <ReferenceView
              onScript={onScript}
              onCombiners={onCombiners}
              onCueLadder={onCueLadder}
            />
          ) : null}
        </View>
      </ScrollView>
    </>
  );
}

type StopsViewProps = {
  section: Section;
  stops: readonly Stop[];
  walk: readonly Stop[];
  sectionNumbers: ReadonlyMap<string, number>;
  progress: Progress | null;
  onStop: (id: string) => void;
  onExam: (sectionNumber: number) => void;
};

/** The section's rail, straight, under the track-wide linear unlock rule. */
function StopsView({
  section,
  stops,
  walk,
  sectionNumbers,
  progress,
  onStop,
  onExam,
}: StopsViewProps) {
  const examReady = examDoorOpen(section, walk, sectionNumbers, progress);
  if (stops.length === 0 && !examReady) {
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
    <>
      {stops.length > 0 ? (
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
      ) : null}
      {examReady ? (
        <ListRow
          label="Ready for the exam"
          sub="Everything to here, asked once. You can step back at the door."
          chevron
          onPress={() => onExam(section.number)}
        />
      ) : null}
    </>
  );
}

/**
 * Whether this section's "Ready for the exam" door shows.
 *
 * Only the two exam sections have one (X1 gates a section, spec §6.1), and only
 * once the walk has covered everything up to and through the section. Reading
 * the walk prefix rather than the section's own stops is the same rule under
 * the linear unlock — and it stays honest while a section's rail is still
 * arriving from content (upstream ask: exam rows). The X1 gate itself remains
 * declinable; this door appears, it never nags.
 */
function examDoorOpen(
  section: Section,
  walk: readonly Stop[],
  sectionNumbers: ReadonlyMap<string, number>,
  progress: Progress | null,
): boolean {
  if (!EXAM_SECTIONS.includes(section.number)) {
    return false;
  }
  const covered = walk.filter(
    stop => (sectionNumbers.get(stop.sectionId) ?? Number.MAX_SAFE_INTEGER) <= section.number,
  );
  return covered.length > 0 && covered.every(stop => selectStopDone(progress, stop.id));
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

type StacksViewProps = {
  section: Section;
  stacks: readonly Stack[];
  letterOrder: ReadonlyMap<string, LetterPlace>;
  onStack: (id: string) => void;
};

/**
 * RB2 inline — the section's stacks, grouped by the records' own `group`.
 *
 * Counts come from the list itself, never typed: the header states the total
 * and the per-attaching-letter breakdown, and each group heading names its
 * distinct attaching letters in the thirty's order. An ambiguous stack shows
 * every reading — དག is ga and thaak, and hiding one would teach a lie.
 *
 * The board's "Practise these stacks" button waits on RB16: the drill machine
 * has no stack mode yet, so the door is absent rather than disabled.
 */
function StacksView({section, stacks, letterOrder, onStack}: StacksViewProps) {
  if (stacks.length === 0) {
    return <EmptyState title="This section teaches no new stacks" />;
  }
  const noun = stacks.length === 1 ? 'stack' : 'stacks';
  const groups = groupStacks(stacks, letterOrder);

  return (
    <>
      <Text className="type-caption text-fg-muted">
        {`Section ${section.number} · ${stacks.length} ${noun}${countBreakdown(groups)}`}
      </Text>
      {groups.map(group => (
        <View key={group.key} className="gap-2">
          <View className="flex-row items-baseline gap-2 pt-2">
            <Text className="type-label text-fg-muted uppercase">{group.label}</Text>
            {group.affixes.length > 0 ? (
              <TibetanText inline size="xs">
                {group.affixes.join(' ')}
              </TibetanText>
            ) : null}
          </View>
          {group.stacks.map(stack => (
            <StackRow
              key={stack.id}
              stack={stack}
              baseName={letterOrder.get(stack.slots.root)?.name ?? null}
              onPress={() => onStack(stack.id)}
            />
          ))}
        </View>
      ))}
    </>
  );
}

type StackGroup = {
  readonly key: string;
  /** The group's heading: "Superscripts", from the records' own `group`. */
  readonly label: string;
  /** The distinct attaching letters, in the thirty's order. */
  readonly affixes: readonly string[];
  /** How many stacks each attaching letter forms, in the same order. */
  readonly affixCounts: readonly number[];
  readonly stacks: readonly Stack[];
};

/** What each `group` value is called as a heading. A new value names itself. */
const GROUP_LABELS: ReadonlyMap<string, string> = new Map([
  ['prefix', 'Prefixes'],
  ['superscript', 'Superscripts'],
  ['subscript', 'Subscripts'],
  ['compound', 'Compounds'],
]);

/** Stacks by their `group` field, keeping the list's own teaching order. */
function groupStacks(
  stacks: readonly Stack[],
  letterOrder: ReadonlyMap<string, LetterPlace>,
): readonly StackGroup[] {
  const byGroup = new Map<string, Stack[]>();
  for (const stack of stacks) {
    const bucket = byGroup.get(stack.group);
    if (bucket === undefined) {
      byGroup.set(stack.group, [stack]);
    } else {
      bucket.push(stack);
    }
  }
  return [...byGroup.entries()].map(([group, members]) => {
    const affixes = [...new Set(members.map(stack => stack.affix).filter(isPresent))].sort(
      (a, b) => (letterOrder.get(a)?.order ?? 0) - (letterOrder.get(b)?.order ?? 0),
    );
    return {
      key: group,
      label: GROUP_LABELS.get(group) ?? group,
      affixes,
      affixCounts: affixes.map(affix => members.filter(stack => stack.affix === affix).length),
      stacks: members,
    };
  });
}

function isPresent(value: string | null): value is string {
  return value !== null;
}

/** " · 12 + 10 + 11" when one group splits by attaching letter; empty otherwise. */
function countBreakdown(groups: readonly StackGroup[]): string {
  if (groups.length !== 1) {
    return '';
  }
  const counts = groups[0]?.affixCounts ?? [];
  return counts.length > 1 ? ` · ${counts.join(' + ')}` : '';
}

type StackRowProps = {
  stack: Stack;
  /** The root letter's name, for the "base ཀ ka" caption. */
  baseName: string | null;
  onPress: () => void;
};

function StackRow({stack, baseName, onPress}: StackRowProps) {
  // Every reading the record carries — the glyph alone may not settle it.
  const readings = [stack.reading, ...stack.readsAlsoAs.map(reading => reading.reading)].filter(
    isPresent,
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={readings.join(' · ') || stack.wylie}
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-lg bg-surface-card p-3"
    >
      <View className="w-[70px] items-center">
        <TibetanText inline size="lg">
          {stack.bo}
        </TibetanText>
        {readings.length > 0 ? (
          <Text className="type-body-strong text-fg-accent">{readings.join(' · ')}</Text>
        ) : null}
      </View>
      <View className="flex-1 gap-1">
        <View className="flex-row flex-wrap items-center gap-1.5">
          {stack.affix !== null ? <SyllableChip glyph={stack.affix} size="sm" /> : null}
          <SyllableChip glyph={stack.slots.root} size="sm" />
        </View>
        {baseName !== null ? (
          <Text className="type-caption text-fg-subtle">
            {mixedTibetan(`base ${stack.slots.root} ${baseName}`)}
          </Text>
        ) : null}
      </View>
      <AudioButton
        size="sm"
        label={`Play ${readings[0] ?? stack.wylie}`}
        onPress={() => {
          if (stack.audio !== null) {
            void playClip(stack.audio);
          }
        }}
      />
    </Pressable>
  );
}

type ReferenceViewProps = {
  onScript: () => void;
  onCombiners: () => void;
  onCueLadder: () => void;
};

/**
 * The hub's Reference segment: the script browser, the combiner index and the
 * cue ladder. The board's fourth row — "Stacks · the two tables" — waits on
 * L6, which has no route yet, so it is absent rather than disabled.
 */
function ReferenceView({onScript, onCombiners, onCueLadder}: ReferenceViewProps) {
  return (
    <>
      <ListRow
        label="The script"
        sub="All thirty, and everything that combines with them"
        chevron
        onPress={onScript}
      />
      <ListRow
        label="The seven that attach"
        sub="Four below the root, three on top — a page each"
        chevron
        onPress={onCombiners}
      />
      <ListRow
        label="Finding the root"
        sub="Six cues, in order, with a word for each"
        chevron
        onPress={onCueLadder}
      />
    </>
  );
}

type ReadableBlockProps = {
  progress: Progress | null;
};

/** How many words the block samples as proof — the count is the real number. */
const READABLE_SAMPLE = 3;

/**
 * The readable-words block — the Read track's proof surface.
 *
 * `readableWords()` over the live snapshot, computed on every render's read
 * and never stored (spec §10.1). Absent, not zeroed, while no letter has been
 * met. The board's "Read these" button waits on a readable-words list route,
 * so the block shows the count and a taste of the words themselves.
 */
function ReadableBlock({progress}: ReadableBlockProps) {
  const load = useContent<readonly ReadWord[]>(
    async source => {
      const state = await deriveReadState({walk: source, script: source}, progress);
      if (state.metLetterBos.size === 0) {
        return [];
      }
      return readableWords({walk: source, script: source, words: source}, progress);
    },
    [progress],
  );

  if (load.status !== 'ready' || load.data.length === 0) {
    return null;
  }
  const words = load.data;
  return (
    <View className="gap-3 rounded-lg bg-surface-card p-4">
      <View className="gap-1">
        <Text className="type-body-strong text-fg-heading">
          {`Words you can now read — ${words.length}`}
        </Text>
        <Text className="type-caption text-fg-muted">
          Decodable with what you’ve learned — most are words you already say.
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {words.slice(0, READABLE_SAMPLE).map(word => (
          <SyllableChip key={word.id} glyph={word.bo} roman={word.reading ?? undefined} size="sm" />
        ))}
      </View>
    </View>
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
