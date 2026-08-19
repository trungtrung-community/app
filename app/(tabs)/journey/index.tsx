/**
 * @fileoverview Journey — the map (S2 ⇄ R1).
 *
 * One screen, two tracks, behind a Speak⇄Read `SegmentedControl`. Speak renders
 * the district rail section by section, grouping `listDistricts()` by
 * `sectionId`. Read renders the full curriculum as one strictly linear rail —
 * sections from `listSections('read')`, stops from `listStopsBySection`, a stop
 * opening when its predecessor is done — with section headers opening the Read
 * section hub (RBH). Every count binds to the content set, none is typed.
 *
 * The two exam waymarks (spec §6.1: 46 nodes = 44 stops + 2 exams) are
 * synthesized from `EXAM_SECTIONS` and drawn locked, because the content set has
 * no exam rows yet — the exams task wires their doors.
 */

import {useRouter} from 'expo-router';
import {useState} from 'react';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {SegmentedControl, type Segment} from '../../../src/components/core/segmented-control';
import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import {HeadRail, type RailStop} from '../../../src/components/learning/head-rail';
import type {RailNodeState} from '../../../src/components/learning/rail-node';
import {SectionHeader} from '../../../src/components/learning/section-header';
import type {SectionId, Track} from '../../../src/ports/content-ids';
import type {District, Section, Stop} from '../../../src/ports/content-model';
import type {Progress} from '../../../src/ports/progress-store';

import {previousDistrict} from '../../../src/domain/district';
import {orderReadStops, walkableReadStopIds} from '../../../src/domain/read-walk';
import {selectStopDone, useProgress} from '../../../src/store/progress';
import {useContent} from '../../../src/store/use-content';

const TRACK_SEGMENTS: readonly Segment[] = [{label: 'Speak'}, {label: 'Read'}];

/**
 * The Read sections an exam waymark follows (spec §6.1: sections 5 and 11).
 *
 * Synthesized here because the content set has no exam rows yet — once it does,
 * the waymarks come from content like every other node.
 */
export const EXAM_SECTIONS: readonly number[] = [5, 11]; // upstream ask: exam rows in content

/** The exam nodes' names, as the board's R1 letters them. */
const EXAM_LABELS: ReadonlyMap<number, string> = new Map([
  [5, 'First exam'],
  [11, 'The final test'],
]);

/**
 * Men-Tsee-Khang is one location holding two districts, drawn as one map node
 * with two doors (`docs/08-glossary.md`: "districts 15+16, one building with
 * two doors; a single map node").
 */
export const TWO_DOOR_PAIRS: readonly (readonly [string, string])[] = [['medicine', 'astrology']];

export default function Journey() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [trackIndex, setTrackIndex] = useState(0);
  const track: Track = trackIndex === 0 ? 'speak' : 'read';
  const progress = useProgress(state => state.progress);

  const load = useContent<MapData>(
    async source => {
      const sections = await source.listSections(track);
      if (track === 'read') {
        const stops = await Promise.all(
          sections.map(section => source.listStopsBySection(section.id)),
        );
        const stopsBySection = new Map(sections.map((section, i) => [section.id, stops[i] ?? []]));
        return {track: 'read', sections, stopsBySection};
      }
      const districts = await source.listDistricts();
      const stops = await Promise.all(
        districts.map(district => source.listStopsByDistrict(district.slug)),
      );
      const stopsBySlug = new Map(districts.map((district, i) => [district.slug, stops[i] ?? []]));
      return {track: 'speak', sections, districts, stopsBySlug};
    },
    [track],
  );

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <View className="px-5 py-3">
        <SegmentedControl items={TRACK_SEGMENTS} active={trackIndex} onChange={setTrackIndex} />
      </View>
      <ScrollView>
        <View className="gap-2 px-5 pb-10">
          {load.status === 'loading' ? <JourneySkeleton /> : null}
          {load.status === 'error' ? <EmptyState title="Try opening the map again" /> : null}
          {load.status === 'ready' && load.data.track === 'speak' ? (
            <JourneyMap
              sections={load.data.sections}
              districts={load.data.districts}
              stopsBySlug={load.data.stopsBySlug}
              progress={progress}
              onOpenDistrict={slug => router.push(`/journey/district/${slug}`)}
            />
          ) : null}
          {load.status === 'ready' && load.data.track === 'read' ? (
            <ReadMap
              sections={load.data.sections}
              stopsBySection={load.data.stopsBySection}
              progress={progress}
              onOpenSection={number => router.push(`/journey/section/${number}`)}
              onOpenStop={id => router.push(`/stop/${id}`)}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

/** What the map loaded, discriminated on the track it was loaded for. */
type MapData =
  | {
      readonly track: 'speak';
      readonly sections: readonly Section[];
      readonly districts: readonly District[];
      readonly stopsBySlug: ReadonlyMap<string, readonly Stop[]>;
    }
  | {
      readonly track: 'read';
      readonly sections: readonly Section[];
      readonly stopsBySection: ReadonlyMap<SectionId, readonly Stop[]>;
    };

type JourneyMapProps = {
  sections: readonly Section[];
  districts: readonly District[];
  stopsBySlug: ReadonlyMap<string, readonly Stop[]>;
  progress: Progress | null;
  onOpenDistrict: (slug: string) => void;
};

function JourneyMap({sections, districts, stopsBySlug, progress, onOpenDistrict}: JourneyMapProps) {
  const unlock: Unlock = {districts, stopsBySlug};
  const ordered = [...sections].sort((a, b) => a.number - b.number);

  if (ordered.length === 0) {
    return (
      <EmptyState title="The walk starts here">
        The map of Lhasa arrives next, district by district.
      </EmptyState>
    );
  }

  return (
    <>
      {ordered.map(section => (
        <SpeakSection
          key={section.id}
          section={section}
          districts={districts
            .filter(district => district.sectionId === section.id)
            .slice()
            .sort((a, b) => a.number - b.number)}
          unlock={unlock}
          progress={progress}
          onOpenDistrict={onOpenDistrict}
        />
      ))}
    </>
  );
}

type SpeakSectionProps = {
  section: Section;
  districts: readonly District[];
  unlock: Unlock;
  progress: Progress | null;
  onOpenDistrict: (slug: string) => void;
};

function SpeakSection({section, districts, unlock, progress, onOpenDistrict}: SpeakSectionProps) {
  const entries = pairTwoDoors(districts);
  const nodes: RailStop[] = entries.map(entry => toRailStop(entry, progress, unlock));

  return (
    <View className="items-center">
      <SectionHeader eyebrow={`Section ${section.number}`}>{section.name}</SectionHeader>
      <HeadRail
        nodes={nodes}
        onSelect={(_stop, index) => {
          const entry = entries[index];
          if (!entry) {
            return;
          }
          if (entry.kind === 'district') {
            if (districtState(progress, entry.district, unlock) === 'open') {
              onOpenDistrict(entry.district.slug);
            }
            return;
          }
          // RailNode's `twoDoor` variant exposes one press target for the whole
          // node (rail-node.tsx: "one location holding two districts... under
          // one label"), so the merged node opens its first door.
          if (twoDoorState(progress, entry.first, entry.second, unlock) === 'open') {
            onOpenDistrict(entry.first.slug);
          }
        }}
      />
    </View>
  );
}

type ReadMapProps = {
  sections: readonly Section[];
  stopsBySection: ReadonlyMap<SectionId, readonly Stop[]>;
  progress: Progress | null;
  onOpenSection: (number: number) => void;
  onOpenStop: (id: string) => void;
};

/**
 * R1's Read half: the whole curriculum as one strictly linear rail.
 *
 * The walkable set is computed once over the track's full stop order, so the
 * section boundary is not a gate of its own — the first stop of a section opens
 * exactly when the last stop of the section before it is done.
 */
function ReadMap({sections, stopsBySection, progress, onOpenSection, onOpenStop}: ReadMapProps) {
  const ordered = [...sections].sort((a, b) => a.number - b.number);

  if (ordered.length === 0) {
    return (
      <EmptyState title="The walk starts here">
        The Read map arrives next, section by section.
      </EmptyState>
    );
  }

  const walk = orderReadStops(ordered, stopsBySection);
  const walkable = walkableReadStopIds(walk, id => selectStopDone(progress, id));
  const exams = EXAM_SECTIONS.filter(number =>
    ordered.some(section => section.number === number),
  ).length;

  return (
    <>
      <Text className="type-caption text-fg-muted pt-4 text-center">
        {`${ordered.length} sections · ${walk.length} stops · ${exams} exams`}
      </Text>
      {ordered.map(section => {
        const stops = [...(stopsBySection.get(section.id) ?? [])].sort(
          (a, b) => a.ordinal - b.ordinal,
        );
        const nodes: RailStop[] = stops.map(stop => toReadRailStop(stop, progress, walkable));
        const examLabel = EXAM_LABELS.get(section.number);
        if (examLabel !== undefined) {
          // Locked and doorless on purpose: the exam does not exist in content
          // yet, and the map never pretends a door where there is no room.
          nodes.push({id: `exam.${section.number}`, state: 'locked', label: examLabel});
        }
        return (
          <View key={section.id} className="items-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={section.name}
              onPress={() => onOpenSection(section.number)}
            >
              <SectionHeader eyebrow={`Section ${section.number}`}>{section.name}</SectionHeader>
            </Pressable>
            {nodes.length > 0 ? (
              <HeadRail
                nodes={nodes}
                onSelect={node => {
                  if (node.id !== undefined && walkable.has(node.id)) {
                    onOpenStop(node.id);
                  }
                }}
              />
            ) : null}
          </View>
        );
      })}
    </>
  );
}

function toReadRailStop(
  stop: Stop,
  progress: Progress | null,
  walkable: ReadonlySet<string>,
): RailStop {
  const done = selectStopDone(progress, stop.id);
  return {
    id: stop.id,
    state: done ? 'done' : walkable.has(stop.id) ? 'current' : 'locked',
    label: stop.name,
  };
}

function JourneySkeleton() {
  return (
    <View className="items-center gap-4 pt-6">
      <Skeleton shape="text" width="30%" />
      <Skeleton shape="text" width="50%" height={22} />
      <View className="flex-row gap-4 pt-2">
        <Skeleton shape="circle" width={56} />
        <Skeleton shape="circle" width={56} />
        <Skeleton shape="circle" width={56} />
      </View>
    </View>
  );
}

/** One entry on the rail: an ordinary district, or a merged two-door node. */
export type RailEntry =
  | {readonly kind: 'district'; readonly district: District}
  | {readonly kind: 'twoDoor'; readonly first: District; readonly second: District};

/**
 * Districts as the rail draws them.
 *
 * A two-door pair collapses into one entry only when both halves are present —
 * the fixture may hold just one of them, and a lone half then renders as its
 * own district rather than silently vanishing.
 */
export function pairTwoDoors(districts: readonly District[]): readonly RailEntry[] {
  const bySlug = new Map(districts.map(district => [district.slug, district]));
  const consumed = new Set<string>();
  const entries: RailEntry[] = [];

  for (const district of districts) {
    if (consumed.has(district.slug)) {
      continue;
    }
    const pair = TWO_DOOR_PAIRS.find(candidate => candidate.includes(district.slug));
    const partnerSlug = pair?.find(slug => slug !== district.slug);
    const partner = partnerSlug ? bySlug.get(partnerSlug) : undefined;

    if (pair && partner) {
      const [firstSlug] = pair;
      const first = district.slug === firstSlug ? district : partner;
      const second = district.slug === firstSlug ? partner : district;
      consumed.add(first.slug);
      consumed.add(second.slug);
      entries.push({kind: 'twoDoor', first, second});
      continue;
    }

    entries.push({kind: 'district', district});
  }

  return entries;
}

type Openness = 'open' | 'locked';

/** What the unlock rule reads: every district, and every district's stops. */
type Unlock = {
  readonly districts: readonly District[];
  readonly stopsBySlug: ReadonlyMap<string, readonly Stop[]>;
};

/**
 * Whether a district's node opens or stays locked — the same rule the district
 * hub applies: the first district opens, a district with its own progress opens
 * (a restored backup must never lock a learner out), and otherwise every stop
 * of the listed district before this one must be done.
 */
function districtState(progress: Progress | null, district: District, unlock: Unlock): Openness {
  const own = unlock.stopsBySlug.get(district.slug) ?? [];
  if (own.some(stop => selectStopDone(progress, stop.id))) {
    return 'open';
  }
  if (district.number === 1) {
    return 'open';
  }
  const previous = previousDistrict(unlock.districts, district.number);
  const previousStops = previous ? (unlock.stopsBySlug.get(previous.slug) ?? []) : [];
  return previousStops.length > 0 && previousStops.every(stop => selectStopDone(progress, stop.id))
    ? 'open'
    : 'locked';
}

/** The merged node opens once either of its two districts would. */
function twoDoorState(
  progress: Progress | null,
  first: District,
  second: District,
  unlock: Unlock,
): Openness {
  return districtState(progress, first, unlock) === 'open' ||
    districtState(progress, second, unlock) === 'open'
    ? 'open'
    : 'locked';
}

function toRailStop(entry: RailEntry, progress: Progress | null, unlock: Unlock): RailStop {
  if (entry.kind === 'twoDoor') {
    return {
      id: `${entry.first.id}+${entry.second.id}`,
      state: toNodeState(twoDoorState(progress, entry.first, entry.second, unlock), false),
      variant: 'twoDoor',
      // The design system's own specimen label for this node — the content set
      // names the two rooms separately, and this is the one place they are
      // shown as the single place they are.
      label: 'Men-Tsee-Khang',
    };
  }
  const own = unlock.stopsBySlug.get(entry.district.slug) ?? [];
  const done = own.length > 0 && own.every(stop => selectStopDone(progress, stop.id));
  return {
    id: entry.district.id,
    state: toNodeState(districtState(progress, entry.district, unlock), done),
    label: entry.district.name,
  };
}

function toNodeState(openness: Openness, done: boolean): RailNodeState {
  if (openness !== 'open') {
    return 'locked';
  }
  return done ? 'done' : 'current';
}
