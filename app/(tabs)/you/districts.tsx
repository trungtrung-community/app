/**
 * @fileoverview You — district progress (Y2).
 *
 * One row per district: how many of the words it teaches the learner has met.
 * A district's vocabulary is read lazily per row rather than once for the whole
 * map, which is affordable here — this screen alone reads it, and the fixture's
 * 22 districts come back in milliseconds.
 */

import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ListRow} from '../../../src/components/core/list-row';
import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import type {District} from '../../../src/ports/content-model';

import {selectCounts, useProgress} from '../../../src/store/progress';
import {useContent} from '../../../src/store/use-content';

type DistrictRow = {
  readonly district: District;
  /** Every id this district teaches, taught rather than homed. */
  readonly ids: readonly string[];
};

export default function Districts() {
  const insets = useSafeAreaInsets();
  const progress = useProgress(s => s.progress);

  const load = useContent(async source => {
    const districts = await source.listDistricts();
    return Promise.all(
      districts.map(async (district): Promise<DistrictRow> => {
        const words = await source.listVocabularyByDistrict(district.slug);
        return {district, ids: words.map(word => word.id)};
      }),
    );
  }, []);

  return (
    <ScrollView className="flex-1 bg-surface-app">
      <View className="gap-2 px-5 pb-8" style={{paddingTop: insets.top}}>
        {load.status === 'loading' ? <RowSkeletons /> : null}
        {load.status === 'error' ? <EmptyState title="Try that again" /> : null}
        {load.status === 'ready'
          ? load.data.map(({district, ids}) => {
              const counts = selectCounts(progress, ids);
              // "Met" here covers a word encountered at all — the met and known
              // states both mean it has been taught, and a district row counts
              // reach, not mastery.
              const met = counts.met + counts.known;
              return (
                <ListRow
                  key={district.id}
                  label={district.name}
                  sub={`${met} of ${ids.length} words met`}
                  chevron={false}
                />
              );
            })
          : null}
      </View>
    </ScrollView>
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
