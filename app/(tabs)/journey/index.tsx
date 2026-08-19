/**
 * @fileoverview Journey — the map (S2 ⇄ R1).
 *
 * One screen, two tracks, behind a Speak⇄Read `SegmentedControl`. Speak renders
 * the district rail section by section, grouping `listDistricts()` by
 * `sectionId`. Read has no districts yet — its sections render as plain rows
 * until the Read map's own stops land in a later package.
 */

import {useRouter} from 'expo-router';
import {useState} from 'react';
import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ListRow} from '../../../src/components/core/list-row';
import {SegmentedControl, type Segment} from '../../../src/components/core/segmented-control';
import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import {HeadRail, type RailStop} from '../../../src/components/learning/head-rail';
import type {RailNodeState} from '../../../src/components/learning/rail-node';
import {SectionHeader} from '../../../src/components/learning/section-header';
import type {Track} from '../../../src/ports/content-ids';
import type {District, Section} from '../../../src/ports/content-model';
import type {Progress} from '../../../src/ports/progress-store';

import {useProgress} from '../../../src/store/progress';
import {useContent} from '../../../src/store/use-content';

const TRACK_SEGMENTS: readonly Segment[] = [{label: 'Speak'}, {label: 'Read'}];

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

  const load = useContent(
    source => Promise.all([source.listSections(track), source.listDistricts()]),
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
          {load.status === 'ready' ? (
            <JourneyMap
              track={track}
              sections={load.data[0]}
              districts={load.data[1]}
              progress={progress}
              onOpenDistrict={slug => router.push(`/journey/district/${slug}`)}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

type JourneyMapProps = {
  track: Track;
  sections: readonly Section[];
  districts: readonly District[];
  progress: Progress | null;
  onOpenDistrict: (slug: string) => void;
};

function JourneyMap({track, sections, districts, progress, onOpenDistrict}: JourneyMapProps) {
  const ordered = [...sections].sort((a, b) => a.number - b.number);

  if (ordered.length === 0) {
    return (
      <EmptyState title="The walk starts here">
        The map of Lhasa arrives next, district by district.
      </EmptyState>
    );
  }

  if (track === 'read') {
    return (
      <>
        {ordered.map(section => (
          <View key={section.id}>
            <SectionHeader eyebrow={`Section ${section.number}`}>{section.name}</SectionHeader>
            <ListRow label={section.name} sub={section.outcome ?? undefined} chevron={false} />
          </View>
        ))}
      </>
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
  progress: Progress | null;
  onOpenDistrict: (slug: string) => void;
};

function SpeakSection({section, districts, progress, onOpenDistrict}: SpeakSectionProps) {
  const entries = pairTwoDoors(districts);
  const nodes: RailStop[] = entries.map(entry => toRailStop(entry, progress));

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
            if (districtState(progress, entry.district) === 'open') {
              onOpenDistrict(entry.district.slug);
            }
            return;
          }
          // RailNode's `twoDoor` variant exposes one press target for the whole
          // node (rail-node.tsx: "one location holding two districts... under
          // one label"), so the merged node opens its first door.
          if (twoDoorState(progress, entry.first, entry.second) === 'open') {
            onOpenDistrict(entry.first.slug);
          }
        }}
      />
    </View>
  );
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

/**
 * Whether a district's node opens or stays locked.
 *
 * The full rule wants every stop of the previous district done, which needs a
 * `listStopsByDistrict` read per district — too many reads for one screen. Until
 * the district hub route lands, the honest first-launch state carries: the very
 * first district on the map opens, and everything else waits. `progress` is
 * threaded through now so the real rule has one place to land.
 */
function districtState(progress: Progress | null, district: District): Openness {
  return district.number === 1 ? 'open' : 'locked';
}

/** The merged node opens once either of its two districts would. */
function twoDoorState(progress: Progress | null, first: District, second: District): Openness {
  return districtState(progress, first) === 'open' || districtState(progress, second) === 'open'
    ? 'open'
    : 'locked';
}

function toRailStop(entry: RailEntry, progress: Progress | null): RailStop {
  if (entry.kind === 'twoDoor') {
    return {
      id: `${entry.first.id}+${entry.second.id}`,
      state: toNodeState(twoDoorState(progress, entry.first, entry.second)),
      variant: 'twoDoor',
      // The design system's own specimen label for this node — the content set
      // names the two rooms separately, and this is the one place they are
      // shown as the single place they are.
      label: 'Men-Tsee-Khang',
    };
  }
  return {
    id: entry.district.id,
    state: toNodeState(districtState(progress, entry.district)),
    label: entry.district.name,
  };
}

function toNodeState(openness: Openness): RailNodeState {
  return openness === 'open' ? 'current' : 'locked';
}
