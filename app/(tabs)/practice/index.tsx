/**
 * @fileoverview Practice — the practice home (Q1).
 *
 * A list, not a hub: a leading row for everything worth another look, then one
 * row per district the learner has met, in journey order (docs/02 "Practice";
 * docs/07 2026-08-15). A district not yet met is absent — never greyed, never
 * locked. Rows are inert until the drill machine lands in a later phase, so
 * the empty state is the whole screen on a first launch.
 */

import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ListRow} from '../../../src/components/core/list-row';
import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import {toIsoDate} from '../../../src/domain/date';
import type {District, Stop} from '../../../src/ports/content-model';
import type {Progress} from '../../../src/ports/progress-store';

import {selectStillGetting, selectStopDone, useProgress} from '../../../src/store/progress';
import {useContent} from '../../../src/store/use-content';

/** One district, with the stops the met-check reads. */
type DistrictStops = {
  readonly district: District;
  readonly stops: readonly Stop[];
};

export default function Practice() {
  const insets = useSafeAreaInsets();
  const progress = useProgress(state => state.progress);

  const load = useContent(async source => {
    const districts = await source.listDistricts();
    return Promise.all(
      districts.map(async (district): Promise<DistrictStops> => ({
        district,
        stops: await source.listStopsByDistrict(district.slug),
      })),
    );
  }, []);

  return (
    <View className="flex-1 bg-surface-app" style={{paddingTop: insets.top}}>
      <ScrollView>
        <View className="gap-2 px-5 pb-8">
          {load.status === 'loading' ? <RowSkeletons /> : null}
          {load.status === 'error' ? <EmptyState title="Try opening practice again" /> : null}
          {load.status === 'ready' ? (
            <PracticeList districts={load.data} progress={progress} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

type PracticeListProps = {
  readonly districts: readonly DistrictStops[];
  readonly progress: Progress | null;
};

/**
 * The rows themselves: the still-getting row, then one per met district.
 *
 * The still-getting row sits above the district rows (docs/02, docs/07
 * 2026-08-15) and appears only when its count is non-zero. `districts`
 * arrives in map order already — `listDistricts` sorts by number — so
 * filtering to the met ones keeps that order without a second sort.
 */
function PracticeList({districts, progress}: PracticeListProps) {
  const met = districts.filter(({stops}) => stops.some(stop => selectStopDone(progress, stop.id)));
  const allTaughtIds = Object.keys(progress?.items ?? {});
  const stillGetting = selectStillGetting(progress, allTaughtIds, toIsoDate(new Date())).length;

  if (met.length === 0 && stillGetting === 0) {
    return (
      <EmptyState title="Practice grows as you walk">
        Each district you meet gathers here for review.
      </EmptyState>
    );
  }

  return (
    <>
      {stillGetting > 0 ? (
        <ListRow label={`Everything · ${stillGetting} you're still getting`} chevron={false} />
      ) : null}
      {met.map(({district}) => (
        <ListRow key={district.id} label={district.name} chevron={false} />
      ))}
    </>
  );
}

/** Loading keeps the shape of the rows it becomes. */
function RowSkeletons() {
  return (
    <View className="gap-2">
      <Skeleton shape="text" />
      <Skeleton shape="text" />
      <Skeleton shape="text" />
    </View>
  );
}
