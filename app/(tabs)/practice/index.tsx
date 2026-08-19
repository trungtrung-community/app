/**
 * @fileoverview Practice — the practice home (Q1), the pool picker and nothing
 * else.
 *
 * A list, not a hub: a leading row for everything worth another look, then one
 * row per district the learner has met, in journey order (docs/02 "Practice";
 * docs/07 2026-08-15). Every row hands a pool to the drill machine — row 0 to
 * the worth-another-look list (Q5), a district row to the picker (Q8) — and
 * the screen runs nothing itself. A district not yet met is absent — never
 * greyed, never locked — and the current district is tinted with the place
 * marker in its gutter, per the board's Q1 frame. The empty state is the whole
 * screen on a first launch.
 */

import {useRouter} from 'expo-router';
import {ScrollView, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {ListRow} from '../../../src/components/core/list-row';
import {EmptyState} from '../../../src/components/feedback/empty-state';
import {Skeleton} from '../../../src/components/feedback/skeleton';
import {toIsoDate} from '../../../src/domain/date';
import type {District, PhraseItem, Stop, VocabularyItem} from '../../../src/ports/content-model';
import type {Progress} from '../../../src/ports/progress-store';
import {color} from '../../../src/theme/tokens.generated';

import {selectStillGetting, selectStopDone, useProgress} from '../../../src/store/progress';
import {useContent} from '../../../src/store/use-content';
import {poolParam} from '../../../src/usecases/drill-pool';

/** One district, with what the met-check and the row figures read. */
type DistrictStops = {
  readonly district: District;
  readonly stops: readonly Stop[];
  readonly vocabulary: readonly VocabularyItem[];
  readonly phrases: readonly PhraseItem[];
};

export default function Practice() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const progress = useProgress(state => state.progress);

  const load = useContent(async source => {
    const districts = await source.listDistricts();
    return Promise.all(
      districts.map(async (district): Promise<DistrictStops> => ({
        district,
        stops: await source.listStopsByDistrict(district.slug),
        vocabulary: await source.listVocabularyByDistrict(district.slug),
        phrases: await source.listPhrasesByDistrict(district.slug),
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
            <PracticeList
              districts={load.data}
              progress={progress}
              onStillGetting={() => router.push('/practice/still-getting')}
              onDistrict={slug =>
                router.push(
                  `/practice/picker?pool=${poolParam({kind: 'district', slug})}&entry=practice`,
                )
              }
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

type PracticeListProps = {
  readonly districts: readonly DistrictStops[];
  readonly progress: Progress | null;
  readonly onStillGetting: () => void;
  readonly onDistrict: (slug: string) => void;
};

/** Met items of one kind — the figures on a district row count these. */
function metCount(items: readonly {readonly id: string}[], progress: Progress | null): number {
  return items.filter(item => {
    const state = progress?.items[item.id]?.state;
    return state === 'met' || state === 'known';
  }).length;
}

/**
 * The rows themselves: the still-getting row, then one per met district.
 *
 * The still-getting row sits above the district rows (docs/02, docs/07
 * 2026-08-15) and appears only when its count is non-zero — no copy explains
 * its absence. `districts` arrives in map order already — `listDistricts`
 * sorts by number — so filtering to the met ones keeps that order without a
 * second sort. The current district — met but not yet finished — is tinted
 * with the place marker in its gutter, and nothing bolder.
 */
function PracticeList({districts, progress, onStillGetting, onDistrict}: PracticeListProps) {
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
        <ListRow
          label={`Everything · ${stillGetting} you're still getting`}
          onPress={onStillGetting}
        />
      ) : null}
      {met.map(({district, stops, vocabulary, phrases}) => {
        const words = metCount(vocabulary, progress);
        const phraseCount = metCount(phrases, progress);
        const current = !stops.every(stop => selectStopDone(progress, stop.id));
        return (
          <ListRow
            key={district.id}
            label={district.name}
            value={`${words} ${words === 1 ? 'word' : 'words'} · ${phraseCount} ${
              phraseCount === 1 ? 'phrase' : 'phrases'
            }`}
            icon={current ? 'map-pin' : undefined}
            style={current ? {backgroundColor: color.surfaceAccentSoft} : undefined}
            onPress={() => onDistrict(district.slug)}
          />
        );
      })}
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
